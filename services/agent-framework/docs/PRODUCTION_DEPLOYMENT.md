# Production Deployment Guide - Agent Framework v1.0

**Date:** 2025-10-17
**Version:** v1.0
**Purpose:** Deploy Agent Framework to production with observability, monitoring, and scaling

---

## 📋 Prerequisites

### Required Services:
- ✅ PostgreSQL database (RDS recommended)
- ✅ OpenAI API access (GPT-4o or GPT-4o-mini)
- ✅ PostHog account (for analytics)
- ✅ Node.js 18+ runtime
- ✅ Load balancer (ALB/NLB for multiple instances)

### Environment Requirements:
- **Database:** PostgreSQL 15+ with 2+ CPU, 4GB+ RAM
- **App Server:** 2+ CPU, 4GB+ RAM per instance
- **Network:** VPC with private subnets for security
- **Storage:** 20GB+ for application logs

---

## 🔐 Environment Variables

Create a `.env.production` file:

```bash
# ============================================
# Server Configuration
# ============================================
NODE_ENV=production
AGENT_PORT=8788

# ============================================
# Database (PostgreSQL)
# ============================================
DATABASE_URL=postgresql://ivylevel_app:SECURE_PASSWORD@prod-db.region.rds.amazonaws.com:5432/ivylevel

# RLS (Row-Level Security) Application Role
# Used for coach isolation
PGUSER=ivylevel_app
PGPASSWORD=SECURE_PASSWORD
PGDATABASE=ivylevel
PGHOST=prod-db.region.rds.amazonaws.com
PGPORT=5432

# ============================================
# OpenAI Configuration
# ============================================
OPENAI_API_KEY=sk-proj-...
JENNY_V9_EQ_MODEL=gpt-4o-2024-08-06
# or
# JENNY_V9_EQ_MODEL=gpt-4o-mini

# ============================================
# Authentication (JWT)
# ============================================
JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_min_32_chars
JWT_EXPIRES_IN=3600  # 1 hour
REFRESH_TOKEN_EXPIRES_IN=604800  # 7 days

# ============================================
# Scheduler (Autonomous Check-ins)
# ============================================
ENABLE_SCHEDULER=true  # Set to 'false' in dev

# ============================================
# PostHog Analytics
# ============================================
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com
# or EU: https://eu.i.posthog.com

# ============================================
# Logging
# ============================================
LOG_LEVEL=info  # production uses 'info', dev uses 'debug'

# ============================================
# CORS (if UI is on different domain)
# ============================================
CORS_ORIGIN=https://app.ivylevel.com

# ============================================
# Rate Limiting
# ============================================
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
```

**Security Notes:**
- ⚠️  **NEVER commit `.env` files to git**
- ✅ Use AWS Secrets Manager or similar for production secrets
- ✅ Rotate `JWT_SECRET` every 90 days
- ✅ Use read-only database replicas for analytics queries

---

## 🏗️ Infrastructure Setup

### Option 1: AWS Deployment (Recommended)

#### 1. Database (RDS PostgreSQL)

**RDS Instance:**
```bash
Instance Class: db.t3.medium (2 vCPU, 4GB RAM)
Storage: 100GB gp3 (with autoscaling to 1TB)
Multi-AZ: Yes (for high availability)
Backup Retention: 7 days
PostgreSQL Version: 15.4
```

**Security Group:**
```hcl
resource "aws_security_group" "rds" {
  name = "ivylevel-rds-sg"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # VPC only
  }
}
```

**Connection String:**
```bash
DATABASE_URL=postgresql://ivylevel_app:PASSWORD@ivylevel-prod.abc123.us-east-1.rds.amazonaws.com:5432/ivylevel
```

#### 2. Application Server (ECS Fargate or EC2)

**Option A: ECS Fargate (Serverless)**

```yaml
# task-definition.json
{
  "family": "ivylevel-agent-framework",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "agent-framework",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/ivylevel-agents:latest",
      "portMappings": [
        {
          "containerPort": 8788,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "AGENT_PORT",
          "value": "8788"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ivylevel/database_url"
        },
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ivylevel/openai_api_key"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ivylevel/jwt_secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ivylevel-agents",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8788/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**Option B: EC2 with PM2**

```bash
# Install PM2
npm install -g pm2

# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'agent-framework',
      script: 'dist/server-agents.js',
      instances: 2,  # Number of instances
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        AGENT_PORT: 8788
      },
      error_file: '/var/log/ivylevel/error.log',
      out_file: '/var/log/ivylevel/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};

# Start
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Auto-start on reboot
pm2 startup
```

#### 3. Load Balancer (ALB)

```hcl
resource "aws_lb" "agents" {
  name               = "ivylevel-agents-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  enable_deletion_protection = true
}

resource "aws_lb_target_group" "agents" {
  name     = "ivylevel-agents-tg"
  port     = 8788
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.agents.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.agents.arn
  }
}
```

#### 4. Auto-Scaling (ECS Service)

```hcl
resource "aws_appautoscaling_target" "agents" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/ivylevel-cluster/ivylevel-agents"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.agents.resource_id
  scalable_dimension = aws_appautoscaling_target.agents.scalable_dimension
  service_namespace  = aws_appautoscaling_target.agents.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

---

## 🚀 Deployment Process

### 1. Build Docker Image

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY services/agent-framework/package.json ./services/agent-framework/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY services/agent-framework ./services/agent-framework
COPY packages ./packages

# Build TypeScript
RUN cd services/agent-framework && pnpm build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
COPY services/agent-framework/package.json ./services/agent-framework/
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/services/agent-framework/dist ./services/agent-framework/dist
COPY --from=builder /app/packages ./packages

# Expose port
EXPOSE 8788

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:8788/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "services/agent-framework/dist/server-agents.js"]
```

**Build & Push:**

```bash
# Build
docker build -t ivylevel-agents:latest -f services/agent-framework/Dockerfile .

# Tag for ECR
docker tag ivylevel-agents:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/ivylevel-agents:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Push
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/ivylevel-agents:latest
```

### 2. Database Migrations

**Run migrations before deploying new code:**

```bash
# SSH into app server or use a migration runner
DATABASE_URL="postgresql://..." npm run migrate

# Or manually run migration scripts
DATABASE_URL="postgresql://..." psql < db/migrations/v15_005_final_schema.sql
```

**Migration Checklist:**
- [ ] Backup database before migration
- [ ] Test migrations in staging first
- [ ] Run migrations during low-traffic window
- [ ] Verify data integrity after migration
- [ ] Keep rollback script ready

### 3. Deploy Application

**Blue-Green Deployment (Recommended):**

```bash
# 1. Deploy new version to "green" environment
aws ecs update-service \
  --cluster ivylevel-cluster \
  --service ivylevel-agents-green \
  --force-new-deployment

# 2. Wait for health checks to pass
aws ecs wait services-stable \
  --cluster ivylevel-cluster \
  --services ivylevel-agents-green

# 3. Switch ALB traffic to green
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$GREEN_TG_ARN

# 4. Monitor for 10 minutes

# 5. If stable, decommission blue
aws ecs update-service \
  --cluster ivylevel-cluster \
  --service ivylevel-agents-blue \
  --desired-count 0
```

---

## 📊 Monitoring & Observability

### 1. PostHog Dashboards

**Agent Performance Dashboard:**
- **Agent Usage:** Which agents are used most
- **Query Patterns:** What students ask about
- **Latency Distribution:** P50, P95, P99
- **Error Rate:** Errors by agent
- **Tool Invocations:** Which tools are called most

**User Engagement Dashboard:**
- **Active Users:** DAU, WAU, MAU
- **Session Duration:** Average time in conversation
- **Message Count:** Messages per session
- **Retention:** 7-day, 30-day retention curves

**Example PostHog Queries:**

```sql
-- Agent usage distribution
SELECT
  properties.agent_id,
  COUNT(*) as execution_count,
  AVG(properties.latency_ms) as avg_latency_ms
FROM events
WHERE event = 'agent_execution'
  AND timestamp >= now() - interval '7 days'
GROUP BY properties.agent_id
ORDER BY execution_count DESC

-- Slowest queries
SELECT
  properties.message_preview,
  properties.agent_id,
  properties.latency_ms
FROM events
WHERE event = 'agent_execution'
  AND properties.latency_ms > 2000
  AND timestamp >= now() - interval '1 day'
ORDER BY properties.latency_ms DESC
LIMIT 100
```

### 2. CloudWatch Alarms

```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "ivylevel-agents-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = "ivylevel-cluster"
    ServiceName = "ivylevel-agents"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "ivylevel-agents-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = "ivylevel-cluster"
    ServiceName = "ivylevel-agents"
  }
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "ivylevel-agents-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High 5xx error rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

### 3. Application Logs

**CloudWatch Logs:**
- Log Group: `/ecs/ivylevel-agents`
- Retention: 30 days
- Filter patterns for errors: `[timestamp, level=ERROR, ...]`

**Example Log Insights Queries:**

```sql
-- Error analysis
fields @timestamp, @message
| filter level = "ERROR"
| stats count() by bin(5m)

-- Slow requests
fields @timestamp, latency_ms, agent_id, student_id
| filter latency_ms > 2000
| sort latency_ms desc
| limit 100

-- Agent usage over time
fields @timestamp, agent_id
| filter event = "agents.chat_success"
| stats count() by agent_id, bin(1h)
```

---

## 🔒 Security Hardening

### 1. Network Security

- ✅ Run application in private subnets
- ✅ Use ALB in public subnet only
- ✅ Database in private subnet (no public IP)
- ✅ Restrict security groups to minimum required ports

### 2. Secrets Management

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name ivylevel/database_url \
  --secret-string "postgresql://..."

# Grant ECS task role access
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ivylevel/*"
      ]
    }
  ]
}
```

### 3. Rate Limiting

**Add to server-agents.ts:**

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

### 4. CORS Configuration

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://app.ivylevel.com',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

---

## 📈 Performance Optimization

### 1. Database Connection Pooling

Already configured in `src/db/pool.ts`:

```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Caching Strategy

**Redis for session caching (optional):**

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache session data for 1 hour
await redis.set(`session:${sessionId}`, JSON.stringify(session), 'EX', 3600);
```

### 3. OpenAI Rate Limits

- Monitor usage in OpenAI dashboard
- Implement exponential backoff for rate limit errors
- Use `gpt-4o-mini` for non-critical queries to reduce costs

---

## ✅ Pre-Launch Checklist

### Infrastructure:
- [ ] Database provisioned and secured
- [ ] Application deployed to ECS/EC2
- [ ] Load balancer configured
- [ ] Auto-scaling enabled
- [ ] CloudWatch alarms configured
- [ ] Backup strategy in place

### Security:
- [ ] All secrets in Secrets Manager
- [ ] JWT secret rotated from dev
- [ ] HTTPS enforced (no HTTP)
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Security groups locked down

### Observability:
- [ ] PostHog configured and tested
- [ ] CloudWatch logs streaming
- [ ] Alerts configured (PagerDuty/Slack)
- [ ] Dashboard created for monitoring

### Testing:
- [ ] Load testing completed
- [ ] Failover testing (simulate DB failure)
- [ ] Blue-green deployment tested
- [ ] Rollback procedure documented

---

## 🆘 Troubleshooting

### Common Issues:

**1. High Latency:**
- Check OpenAI API status
- Review database query performance
- Check network latency between services
- Review CloudWatch metrics for CPU/memory

**2. Connection Pool Exhausted:**
```
Error: remaining connection slots are reserved
```
- Increase `max` in pool configuration
- Check for connection leaks (unclosed connections)
- Review query performance (slow queries hold connections)

**3. PostHog Events Not Appearing:**
- Verify `POSTHOG_API_KEY` is set
- Check PostHog API status
- Review application logs for PostHog errors
- Ensure `postHogService.flush()` is called on shutdown

---

## 📞 Support Contacts

- **Infrastructure:** DevOps team
- **Application:** Backend team
- **Database:** DBA team
- **Monitoring:** On-call engineer (PagerDuty)

---

**Status:** ✅ Production Ready
**Last Updated:** 2025-10-17
**Deployment Tier:** Enterprise
**SLA Target:** 99.9% uptime

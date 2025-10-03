# Jenny v3 Monitoring & Alerting Setup

## Health Check Endpoints

### Basic Health
```bash
curl http://localhost:8787/health
# Response: { "ok": true }
```

### Detailed Health (for dashboards)
```bash
curl http://localhost:8787/health/details
# Response: {
#   "ok": true,
#   "index_name": "jenny-v3-3072-20250930",
#   "db_ping_ms": 5,
#   "uptime_s": 3600
# }
```

## Recommended Alert Thresholds

### 1. Latency Alerts
- **p95 Response Time**: Alert when > 1.5s
- **p99 Response Time**: Alert when > 3s
- Monitor `/search` endpoint specifically

### 2. Error Rate Alerts
- **5xx Error Rate**: Alert when > 1% over 5 minutes
- **412 Error Rate**: Monitor but don't alert (expected behavior)

### 3. Infrastructure Alerts
- **Database Connection**: Alert when `db_ping_ms` = -1 (failed)
- **Database Latency**: Alert when `db_ping_ms` > 100
- **Pinecone Upsert Errors**: Alert on any failures (should be 0)

### 4. Capacity Alerts
- **Memory Usage**: Alert when > 80% of container limit
- **Database Connections**: Alert when > 80% of pool size

## Monitoring Dashboard Queries

### Prometheus/Grafana Example
```promql
# p95 latency
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket{path="/search"}[5m])
)

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / 
rate(http_requests_total[5m])

# Health check status
up{job="jenny-api"}
```

### CloudWatch Example
```json
{
  "MetricName": "ResponseTime",
  "Namespace": "JennyAPI",
  "Dimensions": [{"Name": "Endpoint", "Value": "/search"}],
  "Statistic": "p95",
  "Period": 300,
  "EvaluationPeriods": 2,
  "Threshold": 1500,
  "ComparisonOperator": "GreaterThanThreshold"
}
```

## Log Queries for Troubleshooting

### Search for slow queries
```bash
# If using JSON logs
jq 'select(.path=="/search" and .ms > 1000)' < app.log

# If using text logs
grep "/search" app.log | grep -E "ms: [0-9]{4,}"
```

### Find 5xx errors
```bash
# JSON logs
jq 'select(.status >= 500)' < app.log

# Text logs
grep -E "status: 5[0-9]{2}" app.log
```

## Database Snapshot Recommendation

Before going live, create a clean snapshot:

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > jenny-v3-go-live-$(date +%Y%m%d).sql

# Tag in git
git tag -a "v3-go-live" -m "Jenny v3 production ready state"
git push origin v3-go-live
```

## Quick Health Check Script

```bash
#!/bin/bash
# health_monitor.sh

ENDPOINT="http://localhost:8787/health/details"

while true; do
  RESPONSE=$(curl -s $ENDPOINT)
  DB_PING=$(echo $RESPONSE | jq -r '.db_ping_ms')
  
  if [[ "$DB_PING" == "-1" ]]; then
    echo "ALERT: Database connection failed!"
    # Send alert to PagerDuty/Slack/etc
  elif [[ "$DB_PING" -gt "100" ]]; then
    echo "WARNING: High database latency: ${DB_PING}ms"
  fi
  
  sleep 30
done
```

## Production Readiness Checklist

- [ ] /health/details endpoint working
- [ ] Alert thresholds configured in monitoring system
- [ ] Log retention set to 14 days
- [ ] Database snapshot created and tagged
- [ ] Monitoring dashboard created
- [ ] On-call runbook updated with Jenny v3 endpoints
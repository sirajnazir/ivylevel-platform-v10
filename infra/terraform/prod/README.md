# AWS Prod (2-user tier) — Terraform (added 2025-09-23)

Creates:
- VPC (public subnets)
- Buckets: media, aux-docs, enriched-emails, ai-intelligence
- Cognito User Pool + App Client
- ECS Fargate for API + ALB (HTTP 80)
- Optional RDS Postgres (t4g.micro)

Apply:
  terraform init
  terraform apply \
  -var 'db_password=YOUR_STRONG_PASS' \
  -var 'openai_key=sk-...' \
  -var 'pinecone_key=pcn-...' \
  -var 'pinecone_index=jenny-v1' \
  -var 'pinecone_namespace=jenny_v1'

Outputs: alb_dns, cognito_user_pool_id, cognito_app_client_id, rds_endpoint

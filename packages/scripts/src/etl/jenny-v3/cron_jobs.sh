#!/bin/bash
# Jenny v3 Cron Jobs

# Add to crontab with: crontab -e

# Nightly: Refresh FTS materialized views
# 0 2 * * * psql "postgresql://postgres:postgres@localhost:5432/ivylevel" -c "SELECT refresh_fts();"

# Weekly: Clean reindex to fresh timestamped index (optional)
# 0 3 * * 0 cd /path/to/project && ./reindex_weekly.sh

# Example reindex_weekly.sh:
cat > reindex_weekly.sh << 'EOF'
#!/bin/bash
set -e

export PINECONE_INDEX_NAME="jenny-v3-3072-$(date +%Y%m%d)"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ivylevel"

echo "Starting weekly reindex to $PINECONE_INDEX_NAME"
node src/etl/jenny-v3/index_to_pinecone_v3.cjs

# Update environment
echo "export PINECONE_INDEX=$PINECONE_INDEX_NAME" > .env.pinecone

echo "Reindex complete. Remember to restart services with new index."
EOF

chmod +x reindex_weekly.sh

# Guardrail check (already implemented)
echo "
Guardrail 412 verification:
- Create student with no facts
- Query should return HTTP 412

Test command:
curl -i -X POST http://localhost:8787/search \\
  -H 'content-type: application/json' \\
  -d '{\"q\":\"test\",\"student_id\":\"no-facts-student\"}' | head -5
"
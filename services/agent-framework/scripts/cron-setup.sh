#!/bin/bash
# cron-setup.sh - Set up maintenance cron jobs for Jenny API

set -e

echo "🕒 Setting up Jenny API cron jobs"
echo "=================================="

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
fi

# Create cron job scripts directory
CRON_DIR="/opt/jenny-api-cron"
echo "Creating cron scripts directory: $CRON_DIR"
sudo mkdir -p "$CRON_DIR"

# Create FTS refresh script
cat > /tmp/refresh_fts.sh << 'EOF'
#!/bin/bash
# Refresh FTS materialized views
export DATABASE_URL="$1"
psql "$DATABASE_URL" -c 'SELECT refresh_fts();' >> /var/log/jenny-api-fts.log 2>&1
EOF

# Create log cleanup script
cat > /tmp/cleanup_logs.sh << 'EOF'
#!/bin/bash
# Clean up old query logs
export DATABASE_URL="$1"
psql "$DATABASE_URL" -c 'SELECT cleanup_old_logs();' >> /var/log/jenny-api-cleanup.log 2>&1
EOF

# Create weekly reindex script
cat > /tmp/weekly_reindex.sh << 'EOF'
#!/bin/bash
# Weekly clean reindex
cd /opt/jenny-api
export DATABASE_URL="$1"
export PINECONE_API_KEY="$2"
export OPENAI_API_KEY="$3"
export PINECONE_INDEX="jenny-v3-$(date -u +%Y%m%d-%H%M)"

# Run reindex
npm run reindex >> /var/log/jenny-api-reindex.log 2>&1

# Update production environment with new index
echo "NEW_INDEX=$PINECONE_INDEX" > /tmp/new_index.env
EOF

# Move scripts to cron directory
sudo mv /tmp/refresh_fts.sh "$CRON_DIR/"
sudo mv /tmp/cleanup_logs.sh "$CRON_DIR/"
sudo mv /tmp/weekly_reindex.sh "$CRON_DIR/"
sudo chmod +x "$CRON_DIR"/*.sh

# Create log rotation config
cat > /tmp/jenny-api-logrotate << EOF
/var/log/jenny-api-*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0644 nobody nobody
}
EOF
sudo mv /tmp/jenny-api-logrotate /etc/logrotate.d/jenny-api

# Set up crontab entries
echo "Setting up cron jobs..."
(crontab -l 2>/dev/null || true; cat << EOF

# Jenny API maintenance jobs
# Refresh FTS nightly at 2 AM UTC
0 2 * * * $CRON_DIR/refresh_fts.sh "$DATABASE_URL"

# Clean up old logs daily at 3 AM UTC
0 3 * * * $CRON_DIR/cleanup_logs.sh "$DATABASE_URL"

# Weekly reindex on Sundays at 10 AM UTC (optional - uncomment to enable)
# 0 10 * * 0 $CRON_DIR/weekly_reindex.sh "$DATABASE_URL" "$PINECONE_API_KEY" "$OPENAI_API_KEY"

EOF
) | crontab -

echo ""
echo "✅ Cron jobs configured!"
echo ""
echo "Current crontab:"
crontab -l | grep -A4 "Jenny API"
echo ""
echo "To enable weekly reindex, uncomment the last cron entry"
echo "To monitor logs:"
echo "  tail -f /var/log/jenny-api-*.log"
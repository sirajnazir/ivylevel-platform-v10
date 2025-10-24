#!/usr/bin/env bash
# Real-time v3.2 Production Monitoring Dashboard

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/ivylevel}"

clear
echo "======================================================================"
echo "v3.2 Production Monitoring Dashboard"
echo "======================================================================"
echo "Time: $(date)"
echo ""

echo "=== Database Status ==="
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c "
SELECT 
  COUNT(*) as total_students,
  COUNT(*) FILTER (WHERE is_synthetic = true) as synthetic_students,
  COUNT(*) FILTER (WHERE is_synthetic = false OR is_synthetic IS NULL) as real_students
FROM students;
" 2>/dev/null || echo "❌ Database connection failed"

echo ""
echo "=== v3.2 Tables Status ==="
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c "
SELECT 
  'chips' as table_name, COUNT(*) as row_count FROM chips
UNION ALL
SELECT 'growth_events', COUNT(*) FROM growth_events
UNION ALL
SELECT 'agent_runs', COUNT(*) FROM agent_runs
UNION ALL
SELECT 'outbox', COUNT(*) FROM outbox
UNION ALL
SELECT 'system_events', COUNT(*) FROM system_events
ORDER BY table_name;
" 2>/dev/null

echo ""
echo "=== Outbox Backlog ==="
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -Atc \
  "SELECT COUNT(*) FROM outbox WHERE processed_at IS NULL;" 2>/dev/null | \
  awk '{if ($1 > 100) print "⚠️  " $1 " pending (THRESHOLD EXCEEDED)"; else print "✅ " $1 " pending (threshold: 100)"}'

echo ""
echo "=== PM2 Workers Status ==="
if command -v pm2 &> /dev/null; then
  pm2 jlist 2>/dev/null | jq -r 'if length == 0 then "ℹ️  No PM2 processes running" else .[] | "  \(.name): \(.pm2_env.status) (restarts: \(.pm2_env.restart_time))" end'
else
  echo "ℹ️  PM2 not available"
fi

echo ""
echo "=== API Health ==="
curl -s http://localhost:4101/api/health/liveness 2>/dev/null | \
  jq -r '.status // "DOWN"' 2>/dev/null || echo "ℹ️  API not responding on port 4101"

echo ""
echo "=== Recent Logs ==="
if [ -d "/Users/snazir/ivylevel-platform-v10/logs" ]; then
  echo "Last 5 error log entries:"
  tail -5 /Users/snazir/ivylevel-platform-v10/logs/*-error.log 2>/dev/null | head -5 || echo "ℹ️  No error logs"
else
  echo "ℹ️  Logs directory not found"
fi

echo ""
echo "======================================================================"
echo "Press Ctrl+C to exit | Refresh: manual (run script again)"
echo "======================================================================"

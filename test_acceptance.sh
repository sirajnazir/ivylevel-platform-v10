#!/bin/bash

echo "=== v1.2.4 Acceptance Test ==="

# 1. Check services
echo -e "\n1. Checking services..."
ps aux | grep -E "(4000|4101|4102)" | grep -v grep | wc -l

# 2. Check vitals recompute
echo -e "\n2. Testing vitals recompute..."
curl -s -X POST http://localhost:4000/admin/recompute-all | jq '.results[0].success'

# 3. Check yield report
echo -e "\n3. Testing yield report..."
curl -s "http://localhost:4000/reports/huda?type=yield" 2>/dev/null | jq -r 'if .summary then "✓ Yield report working: \(.summary.overallWinRate)% win rate" else "✗ Yield report failed" end' || echo "✗ API not responding"

# 4. Manual cron test
echo -e "\n4. Testing report generation..."
cd /Users/snazir/ivylevel-platform-v10
npx ts-node cron/recompute.ts &
CRON_PID=$!
sleep 5
kill $CRON_PID 2>/dev/null

# 5. Check generated files
echo -e "\n5. Checking generated files..."
ls -la data/reports/huda/v1.2.4/ 2>/dev/null | grep -E "(yield|temporal)" | wc -l

echo -e "\n=== Test Summary ==="
echo "Expected:"
echo "- Services running: 3+"
echo "- Vitals recompute: true"
echo "- Yield report: Shows win rate %"
echo "- Generated files: 4 (2 JSON + 2 MD)"
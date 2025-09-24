#!/bin/bash
# Test opportunity mining end-to-end

set -e

echo "🔍 Testing Opportunity Mining v1.2.2"
echo

# 1. Check services
echo "1. Checking services..."
curl -sf http://localhost:4000/health >/dev/null && echo "✅ API healthy" || echo "❌ API not running"
echo

# 2. Run dry mining
echo "2. Running dry mining..."
cd tools/ingest
pnpm mine-opps \
  --in ../../data/canonical/jenny-huda \
  --student huda \
  --out ../../data/processed/jenny-huda/opportunities_test.jsonl \
  --dry

# 3. Check output
echo
echo "3. Sample output:"
head -5 ../../data/processed/jenny-huda/opportunities_test.jsonl | jq -c '{type, subtype, opportunity: {name, category}}'

# 4. Count by type
echo
echo "4. Statistics:"
echo "Total observations: $(wc -l < ../../data/processed/jenny-huda/opportunities_test.jsonl)"
echo "By subtype:"
jq -r '.subtype' ../../data/processed/jenny-huda/opportunities_test.jsonl | sort | uniq -c

echo
echo "✅ Mining test complete!"
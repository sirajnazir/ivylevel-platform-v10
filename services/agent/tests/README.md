# Unit Tests for v1.1.1

This directory contains contract tests for the v1.1.1 release, ensuring:
1. **View Contract**: `application` view returns exactly 10 ECs + 5 Awards
2. **Fact Guard**: No "I don't have access" responses for factual queries
3. **Evidence Citation**: Factual answers cite at least one evidence source

## Running the Tests

### Prerequisites
- API service running on http://localhost:4000
- Agent service running on http://localhost:4101
- Vitals populated with data (run backfills first)

### Quick Test (No Dependencies)
```bash
# Run the JavaScript contract test
node tests/quick-contract-test.js

# Or use the shell script
./tests/run-contract-tests.sh
```

### Jest Test Suite
```bash
# Run with Jest (requires dependencies)
cd services/agent
pnpm install
pnpm test:contracts

# Run with coverage
pnpm test tests/vitals-contract.test.ts --coverage
```

### Manual Verification
```bash
# Test 1: Application view contract
curl -s "http://localhost:4000/students/huda/state?view=application" | \
  jq '.apps.submitted | {ecs: (.ecs | length), awards: (.awards | length)}'
# Expected: { "ecs": 10, "awards": 5 }

# Test 2: No hedging
curl -s -X POST http://localhost:4101/respond \
  -H "content-type: application/json" \
  -d '{"studentId":"huda","message":"What is my SAT score?"}' | \
  jq -r '.reply' | grep -i "don't have access"
# Expected: No output (no hedging found)

# Test 3: Evidence citation
curl -s -X POST http://localhost:4101/respond \
  -H "content-type: application/json" \
  -d '{"studentId":"huda","message":"Where did we capture my NCWIT win?"}' | \
  jq -r '.reply'
# Expected: Contains "from your vitals" or "Week X" or similar citation
```

## Test Coverage

### View Contract Tests
- ✓ Default view allows unlimited ECs/awards
- ✓ Application view enforces exactly 10 ECs + 5 awards
- ✓ Each EC has: id, name, position
- ✓ Each award has: id, name, level
- ✓ College list identical in both views

### Fact Guard Tests
- ✓ SAT score queries return specific numbers
- ✓ College list queries return all 28 colleges
- ✓ No hedging phrases in responses
- ✓ Award queries return actual data

### Evidence Tests
- ✓ Award queries cite sources
- ✓ Factual responses include references
- ✓ College decisions reference vitals

### Data Integrity Tests
- ✓ SAT score consistent across queries
- ✓ College counts are accurate
- ✓ EC/Award IDs follow conventions

## Expected Results

All tests should pass with:
- 10 ECs in application view (ec_empowering_ai, ec_synthoria, etc.)
- 5 Awards in application view (award_ncwit, award_sts, etc.)
- SAT score: 1550
- Colleges: 28 total (9 accepted, 11 rejected, 8 waitlisted)
- No hedging phrases
- Evidence citations in responses

## Troubleshooting

### Services Not Running
```bash
# Start services
cd apps/api && pnpm dev
cd services/agent && pnpm dev
```

### No Data in Vitals
```bash
# Run backfills
cd tools/backfill
pnpm emit-gameplan /data/canonical/jenny-huda/01-* huda
pnpm emit-college-decisions /data/canonical/.../college-decisions.json huda
curl -X POST http://localhost:4000/admin/recompute-all
```

### Tests Failing
1. Check service logs for errors
2. Verify vitals are populated: `curl http://localhost:4000/students/huda/state`
3. Check agent is using correct model and temperature settings
4. Ensure NEVER_BLANK_MODE=1 in agent environment
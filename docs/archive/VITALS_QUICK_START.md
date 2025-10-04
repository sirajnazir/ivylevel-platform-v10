# Vitals System Quick Start

## Overview
The Vitals system tracks student metrics through observations (events) that are reduced into a current state (vitals).

## Quick Test
```bash
# Run the smoke test to validate everything is working
./scripts/smoke-test-vitals.sh

# Run the comprehensive facts-first test
./scripts/test-facts-first.sh

# Run the health check
./scripts/health-check.sh
```

## Manual Testing

### 1. Seed an observation
```bash
curl -X POST http://localhost:4000/observe \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "huda",
    "kind": "SAT",
    "subtype": "SAT.final",
    "value": {"score": 1530, "note": "final"},
    "source": "iMessage 2025-02-11",
    "at": "2025-02-11"
  }'
```

### 2. Check vitals
```bash
curl http://localhost:4000/students/huda/state | jq
```

### 3. Test agent factual response
```bash
curl -X POST http://localhost:4000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "huda",
    "message": "What is my final SAT score?"
  }'
```

## Bulk Backfill
To import observations from existing data:

```bash
cd tools/backfill
pnpm install

# Run individual emitters
pnpm run emit-huda      # Basic observations (SAT, activities)
pnpm run emit-colleges  # College list and decisions
pnpm run emit-awards    # Award targets from week 1

# Or run all at once
pnpm run emit-all
```

## Observation Types

| Kind | Subtype | Value Example | Description |
|------|---------|---------------|-------------|
| SAT | SAT.final | `{"score": 1530, "note": "final"}` | SAT test scores |
| GPA | - | `{"weighted": 3.93, "unweighted": 3.71}` | Grade point average |
| ACTIVITY | Synthoria.stats | `{"studentsReached": 6400}` | Activity metrics |
| AWARD | ncwit | `{"status": "WIN"}` | Award outcomes |
| AWARD | targets | `{"targets": ["NCWIT", "JCamp"]}` | Award targets list |
| SUMMER | acceptances | `{"accepted": ["JCamp"]}` | Summer program results |
| WELLNESS | - | `{"sleepHoursPerNight": 8}` | Wellness metrics |
| TRAIT | style | `{"social": "shy", "workload": "high"}` | Student traits |
| APPS | collegeList | `{"colleges": [{"name": "UNC", "status": "Accepted"}]}` | College applications |

## How It Works

1. **Observations** are immutable events with timestamps
2. **Reducer** folds observations into current vitals state
3. **Agent** checks vitals first for factual questions
4. **Cron** recomputes vitals nightly at 03:07 AM

## Key Features

- Never says "I don't have access" when data exists
- Cites sources as "from your vitals/records"  
- Offers to check PDFs or add data when missing
- Temperature adjusted: 0.3 for facts, 0.7 for conversation

## Troubleshooting

- Check logs: `tail -f logs/api/app.log`
- Verify DB: `psql $DATABASE_URL -c "SELECT * FROM observations WHERE student_id='huda';"`
- Force recompute: `curl -X POST http://localhost:4000/observe` with any observation triggers recompute
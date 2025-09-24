# Run Snapshot - 2025-09-24

## System Status

### Services Running
- API: http://localhost:4000
- Agent: http://localhost:4101
- Retriever: http://localhost:4102
- Database: PostgreSQL on localhost:5432

### Key Metrics
- Pinecone Index: `jenny-huda-v1` (19,674 vectors)
- Model: `jenny-v1-2025-09-20` (OpenAI fine-tuned)
- College Decisions: 28 total (9 accepted, 11 rejected, 8 waitlisted)

## Test Commands & Outputs

### 1. Verify Observations
```bash
psql -U postgres -d ivylevel -h localhost -p 5432 -c "SELECT subtype, COUNT(*) FROM observations WHERE student_id = 'huda' AND kind = 'APPS' GROUP BY subtype;"

     subtype      | count 
------------------+-------
 college-decision |    28
 collegeList      |     1
```

### 2. Recompute Vitals
```bash
curl -s -X POST http://localhost:4000/admin/recompute -H "content-type: application/json" -d '{"studentId":"huda"}' | jq '{ok: .ok, collegeCount: .vitals.apps.collegeList | length}'

{
  "ok": true,
  "collegeCount": 28
}
```

### 3. Test College List Response
```bash
curl -sX POST http://localhost:4101/respond -H "content-type: application/json" -d '{"studentId":"huda","message":"Can you list my full college list with final decisions?"}' | jq -r '.reply' | head -10

Here's your full college list along with the final decisions: 
1. **Northwestern University** - REJECTED 
2. **UC Irvine** - ACCEPTED 
3. **UC San Diego** - WAITLISTED 
4. **Carnegie Mellon University** - WAITLISTED 
5. **University of Pennsylvania** - REJECTED 
6. **New York University** - WAITLISTED 
7. **Northeastern University** - ACCEPTED 
8. **MIT** - REJECTED 
9. **University of Southern California** - ACCEPTED 
10. **Stanford University** - REJECTED
```

### 4. Test SAT Score Response
```bash
curl -sX POST http://localhost:4101/respond -H "content-type: application/json" -d '{"studentId":"huda","message":"What was my final SAT score?"}' | jq -r '.reply'

Your final SAT score is 1550, which is also your superscore. This score was achieved on September 24, 2025, according to your records. Keep up the great work!
```

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Set in services
- `PINECONE_API_KEY`: Set in retriever
- `DB_NAME`: ivylevel
- `DB_USER`: postgres
- `DB_HOST`: localhost
- `AGENT_API`: http://localhost:4000
- `NEVER_BLANK_MODE`: 1

### Database Schema
```sql
-- observations table
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  subtype TEXT,
  value JSONB NOT NULL,
  source TEXT NOT NULL,
  at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- student_state table  
CREATE TABLE IF NOT EXISTS student_state (
  student_id TEXT PRIMARY KEY,
  vitals JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## File Paths
- Excel source: `/data/raw/jenny-huda/09-Raw-ApplicationDocs/huda-final-college-list-and-decisions.xlsx`
- Normalized JSON: `/data/canonical/jenny-huda/09-Raw-ApplicationDocs/huda-final-college-list-and-decisions.json`
- Ingest tool: `/tools/ingest/src/normalize_college_decisions.ts`
- Backfill script: `/tools/backfill/emit_college_decisions_sheet.ts`

## Pipeline Flow
```
Excel File → normalize.ts → JSON → emit_college_decisions_sheet.ts → Observations → Reducer → Vitals → Agent
```
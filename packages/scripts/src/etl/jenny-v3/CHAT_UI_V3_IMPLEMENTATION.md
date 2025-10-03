# Jenny v3 Chat UI Implementation with Deep Tracing

## Overview
This implementation provides a complete test chat UI integrated with the Jenny v3 architecture, featuring comprehensive request tracing and logging capabilities.

## Architecture Changes

### 1. **Test Server Updates** (`/apps/api/src/test-server.ts`)
- Now proxies to Jenny API v3 on port 8787 (instead of old agent on 4101)
- Forwards trace IDs via `X-Trace-Id` header
- Supports new v3 response shape with facts, hits, chips, and vitals
- Passes through optional `llm_model` parameter for fine-tune testing

### 2. **UI Updates** (`/apps/web/src/app/page.tsx`)
- Updated to display v3 response structure
- Shows vitals panel with live PostgreSQL facts
- Displays evidence chips with resolution
- Shows search hits from Pinecone (JTBD/interactions)
- Includes model selector for fine-tuned Jenny model
- Shows trace ID for each request

### 3. **API Client Updates** (`/apps/web/src/lib/api.ts`)
- New endpoints: `agentChat`, `getVitals`, `resolveEvidence`
- Supports v3 response shape
- Passes optional week and model parameters

### 4. **Deep Tracing System**

#### Database Schema (`tracing.sql`)
- `query_traces`: Root trace per request with timing, tokens, cost
- `query_trace_events`: Fine-grained phase tracking with durations
- `query_trace_artifacts`: Large payloads stored separately

#### Tracer Module (`/services/jenny-api/src/observability/tracer.ts`)
- Configurable sampling, redaction, verbosity
- Automatic PII redaction (emails, phones)
- Structured event logging with timing
- Artifact storage for large objects

#### Trace Middleware (`/services/jenny-api/src/middleware/trace.ts`)
- Attaches trace to every request
- Propagates trace ID via headers
- Automatic success/failure tracking

#### Instrumented Orchestrator (`/services/jenny-api/src/orchestrator/index.ts`)
Tracks these phases with timing:
1. **vitals**: Facts retrieval from PostgreSQL
2. **rewrite**: Query rewriting
3. **hybrid.search**: JTBD + interactions search
4. **pinecone**: Vector search details
5. **rerank**: Re-ranking results
6. **evidence**: Chip extraction
7. **compose.start/end**: LLM composition with token usage

#### Trace Browsing API (`/services/jenny-api/src/routes/traces.ts`)
- `GET /traces`: List recent traces
- `GET /traces/:id`: Full trace details with events
- `POST /traces/:id/replay`: Replay a trace

## Running the Test Setup

### 1. Start Services
```bash
# Terminal 1: Jenny API (port 8787)
cd services/jenny-api
npm run dev

# Terminal 2: Test Server (port 4000)
cd apps/api
JENNY_API_BASE=http://localhost:8787 tsx src/test-server.ts

# Terminal 3: Chat UI (port 3000)
cd apps/web
pnpm dev
```

### 2. Environment Variables
```bash
export PINECONE_INDEX=jenny-v3-3072-20250930
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ivylevel"
export JENNY_LLM_MODEL="gpt-4o-mini"
export JENNY_LLM_MODEL_FT="ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy"
export TRACE_SAMPLE_RATE=1
export TRACE_LEVEL=full
export TRACE_REDACT=1
export TRACE_STDOUT=1
```

### 3. Test Queries

#### Factual Query (uses PostgreSQL vitals)
```
What is Huda's SAT score?
```
Expected: Should return 1530 from vitals with source evidence

#### Narrative Query (uses Pinecone)
```
How did we fix SAT slips?
```
Expected: Should return narrative from JTBD/interactions with chips

#### Mixed Query (facts + narrative)
```
What were Huda's UC outcomes and dates?
```
Expected: Should combine facts and narrative with evidence

### 4. View Traces

#### List recent traces
```bash
curl http://localhost:8787/traces?limit=5 | jq '.[] | {trace_id, q, total_ms}'
```

#### View specific trace
```bash
TRACE_ID=<id-from-response>
curl http://localhost:8787/traces/$TRACE_ID | jq '.events[] | {phase, duration_ms}'
```

#### View trace timeline
```bash
curl http://localhost:8787/traces/$TRACE_ID | jq '
  .events[] | 
  select(.duration_ms != null) | 
  "\(.phase): \(.duration_ms)ms"
'
```

## Testing Fine-Tuned Model

1. In the UI, paste the fine-tuned model ID in the Model field:
   ```
   ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy
   ```

2. Send a query and compare responses between base and fine-tuned models

3. Check traces to see model used:
   ```bash
   curl http://localhost:8787/traces/$TRACE_ID | jq '.trace.llm_model'
   ```

## Trace Analysis Examples

### Performance Analysis
```bash
# Get average latency by phase
curl http://localhost:8787/traces?limit=50 | jq '
  .[].trace_id as $id | 
  . as $traces |
  ["vitals", "hybrid.search", "rerank", "compose.end"] as $phases |
  $phases[] as $phase |
  ($traces | map(select(.trace_id == $id).events[] | select(.phase == $phase).duration_ms) | add / length) as $avg |
  "\($phase): \($avg)ms"
'
```

### Error Analysis
```bash
# Find failed traces
curl http://localhost:8787/traces?limit=100 | jq '
  .[] | select(.status == "error") | 
  {trace_id, q, error_message}
'
```

## Monitoring Dashboard Queries

### Prometheus Metrics (if integrated)
```promql
# p95 latency by phase
histogram_quantile(0.95, 
  rate(jenny_trace_phase_duration_seconds_bucket[5m])
) by (phase)

# Token usage rate
rate(jenny_llm_tokens_total[5m]) by (type)
```

## Troubleshooting

### No Traces Appearing
1. Check `TRACE_SAMPLE_RATE=1` is set
2. Verify trace middleware is loaded before routes
3. Check PostgreSQL trace tables exist

### Missing Evidence Chips
1. Verify sources have canonical IDs (SRC-XXXX)
2. Check evidence endpoint is accessible
3. Verify chips are being extracted in orchestrator

### Slow Queries
1. Check trace for slow phases
2. Verify Pinecone index is using correct dimensions
3. Check PostgreSQL indexes on vital_facts

## Summary

This implementation provides:
- ✅ Full integration with Jenny v3 architecture
- ✅ Deep tracing of every query phase
- ✅ Support for fine-tuned model testing
- ✅ Real-time vitals display from PostgreSQL
- ✅ Evidence chip resolution
- ✅ Search hit visibility
- ✅ Performance monitoring capabilities
- ✅ Error tracking and debugging tools

The system is ready for comprehensive testing of the new KB structure with both base and fine-tuned Jenny models.
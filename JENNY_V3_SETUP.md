# Jenny v3 Complete Setup Guide

## Current Setup Status

### 🚀 Running Services

1. **Jenny v3 API** (Canonical Facts Framework)
   - URL: `http://localhost:8787`
   - Server: `services/jenny-api/src/server-canonical.ts`
   - Features:
     - ✅ Canonical Facts Framework (filters invalid data like SAT=3)
     - ✅ Returns trace_id with all responses
     - ✅ Handles fact queries without LLM hallucination
     - ✅ Full RAG pipeline for general queries

2. **Test Chat UI** (With Trace Viewer)
   - URL: `http://localhost:3001` (changed from 3000)
   - Location: `apps/test-chat-ui/`
   - Features:
     - ✅ Split view: Chat on left, Trace on right
     - ✅ Real-time trace visualization
     - ✅ Color-coded component badges
     - ✅ Expandable event details
     - ✅ Mock trace data for demonstration

## How to Start Everything

### Terminal 1: Start Jenny API
```bash
cd /Users/snazir/ivylevel-platform-v10/services/jenny-api
npm run dev:canonical
# Server runs on http://localhost:8787
```

### Terminal 2: Start Test Chat UI
```bash
cd /Users/snazir/ivylevel-platform-v10/apps/test-chat-ui
npm run dev
# UI runs on http://localhost:3001
```

## Testing the System

1. Open browser to `http://localhost:3001`
2. Make sure student ID is set to `huda-2025`
3. Try these test queries:

### Test 1: Fact Query (Uses CFF)
- Query: "What was my SAT score?"
- Expected: "Your SAT total score is **1530** (recorded 4/17/2024, confidence: high)"
- Click "view trace" to see CFF execution

### Test 2: General Query (Uses RAG+LLM)
- Query: "How can I improve my college application?"
- Expected: Personalized advice using RAG pipeline
- Trace shows: Intent → Embed → Search → Rerank → Compose

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Test Chat UI  │────▶│   Jenny v3 API  │
│ localhost:3001  │     │ localhost:8787  │
└─────────────────┘     └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │ Canonical Facts │
         │              │    Framework    │
         │              └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Trace Viewer   │     │  PostgreSQL DB  │
│  (Split View)   │     │  Pinecone Index │
└─────────────────┘     └─────────────────┘
```

## Key Files (After Cleanup)

### Active Servers
- `services/jenny-api/src/server-canonical.ts` - Main server with CFF
- `services/jenny-api/src/server-traced.ts` - Server with deep tracing (for future)

### Orchestrators
- `services/jenny-api/src/orchestrator/agentChat-canonical.ts` - CFF-aware orchestration
- `services/jenny-api/src/orchestrator/agentChat-traced.ts` - Traced orchestration (for future)

### UI Components
- `apps/test-chat-ui/app/page.tsx` - Main chat interface
- `apps/test-chat-ui/app/TracePanel.tsx` - Trace visualization
- `apps/test-chat-ui/lib/api.ts` - API client helpers

### Archived (in archive/ directories)
- Old server versions (server.ts, test-server.ts, etc.)
- Old orchestrator versions (agentChat-logged.ts)
- Old retriever server versions

## Trace Visualization Features

The TracePanel shows:
- **Component badges**: orchestrator, retriever, composer, etc.
- **Provider badges**: OpenAI, Pinecone, Cohere, PostgreSQL
- **Timing info**: Duration for each operation
- **Expandable details**: Request/response payloads, metadata
- **Error handling**: Shows API errors if they occur

## Next Steps for Production

1. **Implement Real Database Tracing**
   - Use server-traced.ts with actual Trace class
   - Store traces in query_traces and query_trace_events tables
   - Implement real /traces/:id endpoints

2. **Add Live Trace Updates**
   - Poll for new events while query is in progress
   - Show real-time execution flow

3. **Deploy to Production**
   - Set proper environment variables
   - Configure production Pinecone index
   - Enable monitoring and alerting

## Troubleshooting

- **Port 3000 in use**: Changed to port 3001 for UI
- **Module not found**: Make sure all files are in correct locations
- **API connection failed**: Ensure Jenny API is running on port 8787
- **No trace data**: Currently using mock data; implement real tracing for production
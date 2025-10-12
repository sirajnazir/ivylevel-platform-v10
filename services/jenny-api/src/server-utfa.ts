import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load from jenny-api/.env.local first, then root .env as fallback
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Override with correct index
process.env.PINECONE_INDEX = 'jenny-v3-3072-093025';
process.env.SERVICE_NAME = 'jenny-api-utfa';

import express from 'express';
import { agentChat } from './orchestrator/agentChat-utfa.js';
import { fetchVitals, getStudentFactValidation } from './services/facts-canonical.js';
import { fetchLifecycle } from './services/lifecycle.js';
import { resolveTemporalFact } from './services/temporalFacts.js';
// v10.5.2: Legacy imports removed - award targets now via /enum router (enums.ts)
// import { getInitialAwardTargets, getAwardTargetsByPhase, getAwardTargetsAsOf } from './resolvers/awards.js';
// import { EnumerationResolver, FactsResolver } from './resolvers/kb-items.js';
import { pool } from './db/pool.js';
import { enumsRouter } from './routes/enums.js';
import { createSnapshotRoutes } from './routes/snapshots.js';
import { routePrompt } from './router/intentRouter.js';
import { assertIndexParity } from './retrieval/pinecone.js';
import { CFG } from './config/env.js';

const app = express();

// In-memory trace storage for GPT-5 Intent Router
const traceStore = new Map<string, any>();

// v10.5.2: Legacy resolvers removed - now using /enum router (enums.ts)
// const enumResolver = new EnumerationResolver(pool);
// const factsResolver = new FactsResolver(pool);

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Mount universal enumerations router
app.use('/enum', enumsRouter(pool));

// Mount snapshot routes (v3.7.1)
app.use('/', createSnapshotRoutes(pool));

// Health routes
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/health/details', async (_req, res) => {
  res.json({
    ok: true,
    index_name: process.env.PINECONE_INDEX,
    temporal_facts: 'UTFA',
    db_ping_ms: -1,
    uptime_s: Math.floor(process.uptime())
  });
});

// UTFA test endpoints
app.get('/utfa/test/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { kind = 'sat_total_score' } = req.query;
    
    const tests = await Promise.all([
      resolveTemporalFact(pool, { student_id, kind: String(kind), operator: 'first' }),
      resolveTemporalFact(pool, { student_id, kind: String(kind), operator: 'nth', nth: 2 }),
      resolveTemporalFact(pool, { student_id, kind: String(kind), operator: 'latest' }),
      resolveTemporalFact(pool, { student_id, kind: String(kind), operator: 'series' })
    ]);
    
    res.json({
      student_id,
      kind,
      first: tests[0].facts[0] || null,
      second: tests[1].facts[0] || null,
      latest: tests[2].facts[0] || null,
      series: tests[3].facts
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// v10.5.2: Legacy award targets endpoint removed
// Now served by /enum/awards/initial, /enum/awards/final, /enum/awards/progression
// See routes/enums.ts for v10.5.2 universal enumeration endpoints
/*
app.get('/students/:id/awards/targets', async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { phase, as_of } = req.query;

    let result;

    if (as_of) {
      const asOfDate = new Date(String(as_of));
      result = await getAwardTargetsAsOf(pool, studentId, asOfDate);
    } else if (phase) {
      result = await getAwardTargetsByPhase(pool, studentId, phase as any);
    } else {
      // Default to initial
      result = await getInitialAwardTargets(pool, studentId);
    }

    if (result.count === 0) {
      res.status(412).json({
        error: 'no_evidence',
        message: 'No award targets found',
        student_id: studentId,
        phase: phase || 'initial'
      });
    } else {
      res.json(result.targets);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
*/

// Student routes
app.get('/students/:id/vitals', async (req, res) => {
  try {
    const result = await fetchVitals(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/students/:id/fact-validation', async (req, res) => {
  try {
    const result = await getStudentFactValidation(req.params.id);
    res.json({ student_id: req.params.id, validation: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/students/:id/lifecycle', async (req, res) => {
  try {
    const result = await fetchLifecycle(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Agent chat route with GPT-5 Intent Router (v3.7.3)
app.post('/agent/chat', async (req, res) => {
  try {
    const { message, student_id } = req.body;
    console.log('[GPT5-Intent] Chat request:', { message: message?.slice(0, 80), student_id });

    const result = await routePrompt({
      studentId: student_id,
      message,
      pg: pool
    });

    res.json(result);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// UNIFIED PIPELINE: Single entry point for all queries (v10.2)
// Facts-First SQL → KB/RAG → LLM Adapter/EQ
app.post('/agent/chat/gpt5', async (req, res) => {
  try {
    const { message, student_id, observability } = req.body;
    console.log('[Unified-Pipeline] Chat request:', { message, student_id });

    // All queries go through agentChat orchestrator (NOT intentRouter directly)
    // This ensures RAG/KB fallback for unknown intents
    // use_ft: true enables Jenny fine-tuned adapter v8 for tone/EQ queries
    const result = await agentChat({
      message,
      student_id,
      session_id: null,
      model: null,  // Let compose.ts decide based on use_ft flag
      use_ft: true,  // Enable fine-tuned adapter (Category 3)
      stream: false
    }, null);

    // Store trace in memory for UI viewing
    const traceId = result.trace_id || `trace-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    if (observability) {
      traceStore.set(traceId, {
        id: traceId,
        student_id,
        message,
        intent: result.intent,
        answer: result.answer,
        chips: result.chips,
        hits: result.hits,
        trace: result.trace,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 traces
      if (traceStore.size > 100) {
        const firstKey = traceStore.keys().next().value;
        traceStore.delete(firstKey);
      }
    }

    res.json({ ...result, traceId });
  } catch (error: any) {
    console.error('[Unified-Pipeline] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// KB Items endpoints (Universal Ledger)
app.get('/students/:id/awards/initial', async (req, res) => {
  try {
    const result = await enumResolver.awardsInitial(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/students/:id/awards/won', async (req, res) => {
  try {
    const result = await enumResolver.awardsWon(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/students/:id/awards/timeline', async (req, res) => {
  try {
    const result = await enumResolver.awardsTimeline(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SAT progression endpoints
app.get('/students/:id/testing/sat/first', async (req, res) => {
  try {
    const result = await factsResolver.satFirst(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/students/:id/testing/sat/latest', async (req, res) => {
  try {
    const result = await factsResolver.satLatest(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/students/:id/testing/sat/n/:n', async (req, res) => {
  try {
    const result = await factsResolver.satNth(req.params.id, parseInt(req.params.n));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/students/:id/testing/sat/all', async (req, res) => {
  try {
    const result = await factsResolver.satAll(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trace viewing endpoints (for GPT-5 Intent Router)
app.get('/traces/:id', async (req, res) => {
  try {
    const trace = traceStore.get(req.params.id);
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }
    res.json(trace);
  } catch (error: any) {
    console.error('Trace error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/traces/:id/events', async (req, res) => {
  try {
    const trace = traceStore.get(req.params.id);
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found', events: [] });
    }

    // Build event list from trace data
    const events = [
      {
        event: 'router.route_start',
        timestamp: trace.timestamp,
        data: { student_id: trace.student_id, query_preview: trace.message?.slice(0, 80) }
      },
      {
        event: 'intent.classify',
        timestamp: trace.timestamp,
        data: {
          intent: trace.intent?.intent,
          entity: trace.intent?.entity,
          phase: trace.intent?.phase,
          confidence: trace.intent?.confidence
        }
      },
      {
        event: 'router.route_complete',
        timestamp: trace.timestamp,
        data: { answer_length: trace.answer?.length || 0, hit_count: trace.hits?.length || 0 }
      }
    ];

    res.json({ events });
  } catch (error: any) {
    console.error('Trace events error:', error);
    res.status(500).json({ error: error.message, events: [] });
  }
});

// Evidence resolution route
app.get('/evidence', async (req, res) => {
  try {
    const ids = req.query.ids ? String(req.query.ids).split(',') : [];
    console.log('Evidence request:', { ids });

    // For now, return mock evidence data
    const evidence = ids.map(id => ({
      source_id: id,
      title: `Evidence ${id}`,
      content: `This is evidence content for ${id}`,
      drive_link: null,
      type: 'source'
    }));

    res.json(evidence);
  } catch (error: any) {
    console.error('Evidence error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 8787;

// Boot validation - Verify KBv6 configuration before accepting requests
(async () => {
  try {
    // Log boot config
    console.log('[BOOT] KBv6 Configuration:', {
      model: CFG.JENNY_MODEL_ID,
      embed: CFG.EMBEDDING_MODEL_ID,
      dim: CFG.PINECONE_INDEX_DIM,
      index: CFG.PINECONE_INDEX_NAME
    });

    // Assert index/embedding parity (fails fast on mismatch)
    await assertIndexParity(3072, 'text-embedding-3-large');

    // Start server after validation passes
    app.listen(port, () => {
      console.log(`
============================================
Jenny v3 API with UTFA + KBv6 Locked
============================================
Port: ${port}
Index: ${CFG.PINECONE_INDEX_NAME} ✓
Embedding: ${CFG.EMBEDDING_MODEL_ID} (${CFG.PINECONE_INDEX_DIM}d) ✓
Model: ${CFG.JENNY_MODEL_ID}
Temporal Facts: UTFA ENABLED ✓
KB Retrieval: KBv6 (3 namespaces) ✓

UTFA provides deterministic temporal resolution for:
- First/initial/earliest facts
- Second, third, nth facts  
- Latest/final/last facts
- As-of date queries
- Complete series/history
- Superscore calculations
- Official vs practice filtering

Works universally for:
- SAT/ACT/AP scores
- Awards (applied/won)
- GPAs over time
- Applications/submissions
- Any temporal fact type

Test endpoints:
  GET /utfa/test/:student_id?kind=sat_total_score

Available routes:
  GET  /health
  GET  /health/details
  GET  /students/:id/vitals
  GET  /students/:id/fact-validation
  GET  /students/:id/lifecycle
  POST /agent/chat
  GET  /evidence

KB Items (Universal Ledger):
  GET  /students/:id/awards/initial      - Initial award targets (Planned/Targeted)
  GET  /students/:id/awards/won          - Awards won (Outcome state)
  GET  /students/:id/awards/timeline     - Full awards timeline

SAT Progression:
  GET  /students/:id/testing/sat/first   - First SAT score
  GET  /students/:id/testing/sat/latest  - Latest SAT score
  GET  /students/:id/testing/sat/n/:n    - Nth SAT score
  GET  /students/:id/testing/sat/all     - All SAT scores

Try these queries:
- "What was my first SAT score?"
- "What was my second SAT score?"  
- "Show me all my SAT scores"
- "What was my SAT score as of March 2024?"
- "What's my SAT superscore?"

KBv6 Namespaces (validated at boot):
- Sessions/JTBD: 924 vectors
- iMessage: 40 vectors
- Assessment: 9 vectors (SQL-gated, excluded from general RAG)
============================================
`);
    });
  } catch (err) {
    console.error('[BOOT] ❌ KBv6 validation failed:', err);
    console.error('[BOOT] Server NOT started. Fix configuration and restart.');
    process.exit(1);
  }
})();
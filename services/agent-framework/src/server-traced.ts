import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Override with correct index
process.env.PINECONE_INDEX = 'jenny-v3-3072-093025';
process.env.SERVICE_NAME = 'agent-framework-traced';

import express from 'express';
import { agentChatTraced } from './orchestrator/agentChat-traced.js';
import { fetchVitals, getStudentFactValidation } from './services/facts-canonical.js';
import { fetchLifecycle } from './services/lifecycle.js';
import { pool } from './db/pool.js';
import { Trace } from './tracing/trace.js';

const app = express();

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

// Health routes
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/health/details', async (_req, res) => {
  res.json({
    ok: true,
    index_name: process.env.PINECONE_INDEX,
    canonical_facts: true,
    deep_tracing: true,
    db_ping_ms: -1,
    uptime_s: Math.floor(process.uptime())
  });
});

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

// Agent chat route with tracing
app.post('/agent/chat', async (req, res) => {
  try {
    console.log('Chat request (traced):', { 
      message: req.body.message, 
      student_id: req.body.student_id,
      canonical: true,
      tracing: true 
    });
    
    const result = await agentChatTraced(req.body, res);
    
    if (!req.body?.stream) {
      res.json(result);
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trace endpoints
app.get('/traces/recent', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM recent_traces LIMIT 50`
    );
    res.json({ traces: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/traces/:id', async (req, res) => {
  try {
    const trace = await Trace.load(req.params.id);
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }
    res.json(trace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/traces/student/:studentId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        id, message, intent, detected_fact_kinds, 
        start_time, duration_ms, model_used, error
       FROM query_traces 
       WHERE student_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [req.params.studentId]
    );
    res.json({ traces: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/traces/:id/events', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM query_trace_events 
       WHERE trace_id = $1 
       ORDER BY sequence`,
      [req.params.id]
    );
    res.json({ events: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trace analytics endpoints
app.get('/traces/analytics/performance', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        component,
        operation,
        api_provider,
        COUNT(*) as call_count,
        AVG(duration_ms) as avg_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        MIN(duration_ms) as min_duration_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_duration_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms
       FROM query_trace_events
       WHERE end_time IS NOT NULL
         AND created_at > now() - interval '1 hour'
       GROUP BY component, operation, api_provider
       ORDER BY avg_duration_ms DESC`
    );
    res.json({ performance: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`
==========================================
Jenny v3 API with Deep Tracing & CFF
==========================================
Port: ${port}
Index: ${process.env.PINECONE_INDEX}
CFF: ENABLED ✓
Tracing: ENABLED ✓

The system now traces:
- Intent detection (fact vs general queries)
- Canonical fact resolution with filtering
- Hybrid search (Pinecone + Lexical + Cohere)
- LLM composition with policy enforcement
- All 3P API calls with sanitized payloads

Available routes:
  GET  /health
  GET  /health/details
  GET  /students/:id/vitals
  GET  /students/:id/fact-validation
  GET  /students/:id/lifecycle
  POST /agent/chat

Trace routes:
  GET  /traces/recent
  GET  /traces/:id
  GET  /traces/student/:studentId
  GET  /traces/:id/events
  GET  /traces/analytics/performance

Try: "What was my SAT score?" → Will use CFF + trace
Try: "How can I improve my profile?" → Will use RAG+LLM + trace
==========================================
`);
});
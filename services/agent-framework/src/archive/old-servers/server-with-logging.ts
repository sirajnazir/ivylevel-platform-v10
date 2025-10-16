import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Set environment for logging
process.env.PINECONE_INDEX = 'jenny-v3-3072-093025';
process.env.SERVICE_NAME = 'agent-framework';
process.env.LOG_JSON_PATH = '/tmp/jenny-unified.log';
process.env.LOG_LEVEL = 'info';

import express from 'express';
import { requestContext } from '../../../packages/observability/dist/express-mw.js';
import { createLogger } from '../../../packages/observability/dist/unified-logger.js';
import { agentChat } from './orchestrator/agentChat-logged.js';
import { fetchVitals } from './services/facts-logged.js';
import { fetchLifecycle } from './services/lifecycle.js';

const app = express();
const log = createLogger('api');

// Enable CORS for browser requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Trace-Id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Add request context middleware AFTER body parser
app.use(requestContext());

// Health routes
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/health/details', async (_req, res) => {
  res.json({
    ok: true,
    index_name: process.env.PINECONE_INDEX || 'not_set',
    db_ping_ms: -1,
    uptime_s: Math.floor(process.uptime()),
    logging: true,
    log_path: process.env.LOG_JSON_PATH
  });
});

// Student routes
app.get('/students/:id/vitals', async (req, res) => {
  const start = Date.now();
  try {
    log.event('vitals_request', { student_id: req.params.id });
    const result = await fetchVitals(req.params.id);
    log.event('vitals_response', { 
      student_id: req.params.id, 
      facts_count: result.facts?.length || 0,
      duration_ms: Date.now() - start 
    });
    res.json(result);
  } catch (error: any) {
    log.error('vitals_error', error, { student_id: req.params.id, duration_ms: Date.now() - start });
    res.status(500).json({ error: error.message });
  }
});

app.get('/students/:id/lifecycle', async (req, res) => {
  const start = Date.now();
  try {
    log.event('lifecycle_request', { student_id: req.params.id });
    const result = await fetchLifecycle(req.params.id);
    log.event('lifecycle_response', { 
      student_id: req.params.id, 
      events_count: result.events?.length || 0,
      duration_ms: Date.now() - start 
    });
    res.json(result);
  } catch (error: any) {
    log.error('lifecycle_error', error, { student_id: req.params.id, duration_ms: Date.now() - start });
    res.status(500).json({ error: error.message });
  }
});

// Agent chat route
app.post('/agent/chat', async (req, res) => {
  const { message, student_id, session_id, stream } = req.body;
  const start = Date.now();
  
  try {
    log.event('chat_request', { 
      message_preview: message?.slice(0, 120), 
      student_id, 
      session_id, 
      stream 
    });
    
    const result = await agentChat(req.body, res);
    
    if (!stream) {
      log.event('chat_response', {
        duration_ms: Date.now() - start,
        chips_count: result.chips?.length || 0,
        hits_count: result.hits?.length || 0,
        vitals_count: result.vitals?.facts?.length || 0,
        trace_id: result.trace_id
      });
      res.json(result);
    } else {
      log.event('chat_stream_complete', { duration_ms: Date.now() - start });
    }
  } catch (error: any) {
    log.error('chat_error', error, { duration_ms: Date.now() - start });
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  log.error('unhandled_error', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  log.event('server_start', { 
    port, 
    index: process.env.PINECONE_INDEX,
    service: process.env.SERVICE_NAME,
    log_path: process.env.LOG_JSON_PATH 
  });
  console.log(`
Jenny v3 API (with unified logging) running on ${port}
Pinecone index: ${process.env.PINECONE_INDEX}
Log output: ${process.env.LOG_JSON_PATH || '/tmp/jenny-unified.log'}

Available routes:
  GET  /health
  GET  /health/details
  GET  /students/:id/vitals
  GET  /students/:id/lifecycle
  POST /agent/chat

To tail logs:
  tail -f ${process.env.LOG_JSON_PATH} | jq '.'

To view specific trace:
  node packages/observability/log_view.cjs /tmp/jenny-unified.log trace:<trace_id>
`);
});
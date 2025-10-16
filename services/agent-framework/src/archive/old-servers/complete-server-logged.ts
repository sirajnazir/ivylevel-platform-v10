import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Override index
process.env.PINECONE_INDEX = 'jenny-v3-3072-093025';
process.env.SERVICE_NAME = 'agent-framework';

import express from 'express';
import { requestContext } from '../../../packages/observability/express-mw.js';
import { createLogger } from '../../../packages/observability/unified-logger.js';
import { agentChat } from './orchestrator/agentChat.js';
import { fetchVitals } from './services/facts.js';
import { fetchLifecycle } from './services/lifecycle.js';

const app = express();
const log = createLogger('api');

// Enable CORS for browser requests
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
    uptime_s: Math.floor(process.uptime())
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
        vitals_count: result.vitals?.facts?.length || 0
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
    service: process.env.SERVICE_NAME 
  });
  console.log(`Jenny v3 API (with logging) running on ${port}`);
  console.log(`Pinecone index: ${process.env.PINECONE_INDEX}`);
  console.log(`Log output: ${process.env.LOG_JSON_PATH || '/tmp/jenny-unified.log'}`);
  console.log('Available routes:');
  console.log('  GET  /health');
  console.log('  GET  /health/details');
  console.log('  GET  /students/:id/vitals');
  console.log('  GET  /students/:id/lifecycle');
  console.log('  POST /agent/chat');
});
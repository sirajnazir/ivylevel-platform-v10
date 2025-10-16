import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Override with correct index
process.env.PINECONE_INDEX = 'jenny-v3-3072-093025';
process.env.SERVICE_NAME = 'agent-framework-temporal';

import express from 'express';
import { agentChat } from './orchestrator/agentChat-temporal.js';
import { fetchVitals, getStudentFactValidation } from './services/facts-canonical.js';
import { fetchLifecycle } from './services/lifecycle.js';

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

// Debug route
app.get('/debug/orchestrator', (_req, res) => {
  res.json({ 
    orchestrator: 'agentChat-temporal',
    temporal_enabled: true,
    server: 'server-temporal.ts'
  });
});

app.get('/health/details', async (_req, res) => {
  res.json({
    ok: true,
    index_name: process.env.PINECONE_INDEX,
    temporal_facts: true,
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

// Agent chat route with temporal awareness
app.post('/agent/chat', async (req, res) => {
  try {
    console.log('Chat request:', { 
      message: req.body.message, 
      student_id: req.body.student_id,
      temporal: true 
    });
    
    const result = await agentChat(req.body, res);
    
    if (!req.body?.stream) {
      res.json(result);
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
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
app.listen(port, () => {
  console.log(`
============================================
Jenny v3 API with Temporal Fact Resolution
============================================
Port: ${port}
Index: ${process.env.PINECONE_INDEX}
Temporal Facts: ENABLED ✓

The Temporal Facts Framework provides:
- First/earliest vs last/latest distinction
- Practice vs official modality awareness
- Min/max value queries (lowest/highest)
- Transparent "why" explanations
- Range validation (SAT 200-1600, ACT 1-36)

Available routes:
  GET  /health
  GET  /health/details
  GET  /students/:id/vitals
  GET  /students/:id/fact-validation
  GET  /students/:id/lifecycle
  POST /agent/chat
  GET  /evidence

Try these queries:
- "What was my first SAT score?" → Earliest
- "What was my last SAT score?" → Latest
- "What was my highest SAT?" → Maximum
- "What was my first official SAT?" → Earliest + official
============================================
`);
});
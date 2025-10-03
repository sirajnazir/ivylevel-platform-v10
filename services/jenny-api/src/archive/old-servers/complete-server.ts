import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Override index with new one
process.env.PINECONE_INDEX = 'jenny-v3-3072-093025';

import express from 'express';
import { agentChat } from './orchestrator/agentChat.js';
import { fetchVitals } from './services/facts.js';
import { fetchLifecycle } from './services/lifecycle.js';

const app = express();

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
  try {
    const result = await fetchVitals(req.params.id);
    res.json(result);
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

// Agent chat route
app.post('/agent/chat', async (req, res) => {
  try {
    console.log('Chat request:', req.body);
    const result = await agentChat(req.body, res);
    
    if (!req.body?.stream) {
      res.json(result);
    }
  } catch (error: any) {
    console.error('Chat error:', error);
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
  console.log(`Jenny v3 API running on ${port}`);
  console.log(`Pinecone index: ${process.env.PINECONE_INDEX}`);
  console.log('Available routes:');
  console.log('  GET  /health');
  console.log('  GET  /health/details');
  console.log('  GET  /students/:id/vitals');
  console.log('  GET  /students/:id/lifecycle');
  console.log('  POST /agent/chat');
});
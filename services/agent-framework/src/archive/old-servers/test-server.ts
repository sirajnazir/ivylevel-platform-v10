import express from 'express';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Override
process.env.PINECONE_INDEX = 'jenny-v3-3072-20250930';

const app = express();
app.use(express.json());

// Simple health check
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Test chat endpoint
app.post('/agent/chat', async (req, res) => {
  try {
    console.log('Chat request:', req.body);
    
    // Import the orchestrator
    const { agentChat } = await import('./orchestrator/agentChat.js');
    const result = await agentChat(req.body, res);
    
    if (!req.body?.stream) {
      res.json(result);
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`Test server running on ${port}`);
  console.log(`Pinecone index: ${process.env.PINECONE_INDEX}`);
});
/**
 * server-agents.ts
 * Development server for testing agents
 * Created: 2025-10-16 (Phase 1, Week 4)
 */

import express from 'express';
import dotenv from 'dotenv';
import agentsRouter from './routes/agents.js';
import { createLogger } from '../../../packages/observability/dist/unified-logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.AGENT_PORT || 8788;
const log = createLogger('agents-server');

// Middleware
app.use(express.json());

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'agent-framework',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount agents routes
app.use('/api/agents', agentsRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error('server.error', err, {
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  log.event('server.started', { port: PORT });

  console.log('');
  console.log('============================================');
  console.log('🤖 IvyLevel Agent Framework v1.0');
  console.log('============================================');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Model: ${process.env.JENNY_V9_EQ_MODEL || 'gpt-4o-mini'}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log('');
  console.log('Available Endpoints:');
  console.log('  POST /api/agents/chat        - Execute agent');
  console.log('  GET  /api/agents/list         - List all agents');
  console.log('  GET  /api/agents/:agent_id    - Get agent details');
  console.log('  GET  /api/agents/stats        - Get usage stats');
  console.log('  GET  /health                  - Health check');
  console.log('');
  console.log('Test the API:');
  console.log(`  curl http://localhost:${PORT}/api/agents/list`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/agents/chat \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"student_id": "huda-2025", "message": "What is my game plan?"}'`);
  console.log('');
  console.log('============================================');
  console.log('');
});

export default app;

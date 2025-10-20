/**
 * server-agents.ts
 * Development server for testing agents
 * Created: 2025-10-16 (Phase 1, Week 4)
 * Updated: 2025-10-17 - Added scheduler for autonomous check-ins
 */

import express from 'express';
import dotenv from 'dotenv';
import agentsRouter from './routes/agents.js';
import authRouter from './routes/auth.js';
import tacticsRouter from './routes/tactics.js';
import { createLogger } from '../../../packages/observability/dist/unified-logger.js';
import { pool } from './db/pool.js';
import { SchedulerService } from './scheduler/SchedulerService.js';
import { registerJobHandlers } from './scheduler/jobHandlers.js';
import { postHogService } from './services/PostHogService.js';

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
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

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

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/tactics', tacticsRouter);

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

// Initialize scheduler (if enabled)
let scheduler: SchedulerService | null = null;
if (process.env.ENABLE_SCHEDULER === 'true') {
  scheduler = new SchedulerService(pool);
  registerJobHandlers(scheduler);
  scheduler.start();
  console.log('✅ Scheduler started (autonomous check-ins enabled)');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.event('server.shutdown_start');
  console.log('\nShutting down gracefully...');

  // Stop scheduler
  if (scheduler) {
    scheduler.stop();
    console.log('✅ Scheduler stopped');
  }

  // Flush and shutdown PostHog
  try {
    await postHogService.flush();
    await postHogService.shutdown();
    console.log('✅ PostHog flushed and shutdown');
  } catch (error: any) {
    console.error('⚠️  PostHog shutdown error:', error.message);
  }

  // Close database pool
  pool.end(() => {
    console.log('✅ Database pool closed');
    process.exit(0);
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
  console.log(`Scheduler: ${process.env.ENABLE_SCHEDULER === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log('');
  console.log('Available Endpoints:');
  console.log('');
  console.log('Authentication:');
  console.log('  POST /api/auth/login          - Login and get JWT');
  console.log('  GET  /api/auth/me             - Get profile (requires JWT)');
  console.log('  POST /api/auth/refresh        - Refresh access token');
  console.log('  POST /api/auth/logout         - Logout');
  console.log('  POST /api/auth/change-password - Change password (requires JWT)');
  console.log('');
  console.log('Agents (Protected - Requires JWT):');
  console.log('  POST /api/agents/chat         - Execute agent');
  console.log('  GET  /api/agents/list         - List all agents');
  console.log('  GET  /api/agents/:agent_id    - Get agent details');
  console.log('  GET  /api/agents/sessions/:student_id - Get student sessions');
  console.log('  GET  /api/agents/replay/:session_id - Get conversation replay');
  console.log('');
  console.log('Test the API:');
  console.log('');
  console.log('1. Login:');
  console.log(`  curl -X POST http://localhost:${PORT}/api/auth/login \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"email": "jenny@ivylevel.com", "password": "IvyLevel2024!"}'`);
  console.log('');
  console.log('2. Use JWT token (copy access_token from login):');
  console.log(`  curl -X POST http://localhost:${PORT}/api/agents/chat \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\`);
  console.log(`    -d '{"student_id": "huda-2025", "message": "What is my game plan?"}'`);
  console.log('');
  console.log('============================================');
  console.log('');
});

export default app;

import './config.js'; // Load and validate environment variables first
import express from 'express';
import { initOTel } from './observability/otel.js';
import { initSentry } from './observability/sentry.js';
import { agent } from './routes/agent.js';
import { vitals } from './routes/vitals.js';
import { lifecycle } from './routes/lifecycle.js';
import { health } from './routes/health.js';

(async ()=>{
  await initOTel().catch(()=>{});
  const app = express();
  app.use(express.json({ limit:'1mb' }));
  initSentry(app);

  app.use('/', health);
  app.use('/students', vitals, lifecycle);
  app.use('/agent', agent);

  const port = process.env.PORT || 8787;
  app.listen(port, ()=> console.log(`Jenny API listening on ${port}`));
})();
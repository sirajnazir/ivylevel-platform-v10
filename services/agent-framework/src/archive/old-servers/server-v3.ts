import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from parent directory .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Override the index name
process.env.PINECONE_INDEX = 'jenny-v3-3072-20250930';

import express from 'express';
import { initOTel } from './observability/otel.js';
import { initSentry } from './observability/sentry.js';
import { agent } from './routes/agent.js';
import { vitals } from './routes/vitals.js';
import { lifecycle } from './routes/lifecycle.js';
import { health } from './routes/health.js';

(async ()=>{
  console.log('Starting Jenny v3 API...');
  console.log('Pinecone Index:', process.env.PINECONE_INDEX);
  
  await initOTel().catch(()=>{});
  const app = express();
  app.use(express.json({ limit:'1mb' }));
  
  try {
    initSentry(app);
  } catch(e) {
    console.log('Sentry init failed (continuing without it):', e.message);
  }

  app.use('/', health);
  app.use('/students', vitals, lifecycle);
  app.use('/agent', agent);

  const port = process.env.PORT || 8787;
  app.listen(port, ()=> console.log(`Jenny API listening on ${port}`));
})();
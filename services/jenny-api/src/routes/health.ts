import { Router } from 'express';
export const health = Router();
health.get('/health', (_req,res)=> res.json({ ok:true }));
health.get('/health/details', async (_req,res)=> {
  res.json({
    ok: true,
    index_name: process.env.PINECONE_INDEX || 'not_set',
    db_ping_ms: -1,
    uptime_s: Math.floor(process.uptime())
  });
});
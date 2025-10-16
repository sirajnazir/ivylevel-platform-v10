import { Router } from 'express';
import { agentChat } from '../orchestrator/agentChat';
import { withApiKey, withRateLimit } from '../middleware/security';

export const agent = Router();
agent.post('/chat', withRateLimit, withApiKey, async (req:any, res:any) => {
  const result = await agentChat(req.body, res);
  if (!req.body?.stream) res.json(result);
});
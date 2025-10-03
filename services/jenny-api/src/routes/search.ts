import { Router } from 'express';
import { z } from 'zod';
import { orchestrateUserQuery } from '../orchestrator/index.js';

export const search = Router();

const searchSchema = z.object({ 
  q: z.string(), 
  filters: z.any().optional(), 
  student_id: z.string().optional(),
  week: z.number().optional(),
  llm_model: z.string().optional()
});

search.post('/', async (req, res, next) => {
  try {
    const body = searchSchema.parse(req.body);
    const student = body.student_id || process.env.DEFAULT_STUDENT_ID || 'huda-2025';
    
    // Pass request and response context for tracing
    const out = await orchestrateUserQuery(body.q, { student_id: student }, { req, res });
    
    res.json(out);
  } catch (e){ 
    // Trace failure is handled in middleware
    next(e); 
  }
});
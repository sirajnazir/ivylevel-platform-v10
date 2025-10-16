import { Router } from 'express';
import { z } from 'zod';
import { tacticOutcomeMatrix } from '../services/analytics.js';

export const analytics = Router();

analytics.get('/tactic-outcomes', async (req, res, next) => {
  try {
    const Q = z.object({ student_id: z.string() }).parse(req.query);
    const out = await tacticOutcomeMatrix(Q.student_id);
    res.json(out);
  } catch (e){ next(e); }
});
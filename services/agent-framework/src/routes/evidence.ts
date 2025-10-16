import { Router } from 'express';
import { z } from 'zod';
import { resolveEvidence } from '../services/evidence.js';

export const evidence = Router();

evidence.get('/', async (req, res, next) => {
  try {
    const Q = z.object({ ids: z.string() }).parse(req.query);
    const ids = Q.ids.split(',').map(s=>s.trim()).filter(Boolean);
    const out = await resolveEvidence(ids);
    res.json(out);
  } catch (e){ next(e); }
});
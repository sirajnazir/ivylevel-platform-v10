import { Router } from 'express';
import { z } from 'zod';
import { getStudentVitals } from '../services/facts.js';
import { getLifecycle } from '../services/lifecycle.js';

export const students = Router();

students.get('/:id/vitals', async (req, res, next) => {
  try {
    const out = await getStudentVitals(req.params.id);
    res.json(out);
  } catch (e){ next(e); }
});

students.get('/:id/lifecycle', async (req, res, next) => {
  try {
    const Q = z.object({ domain: z.string().optional() }).parse(req.query);
    const out = await getLifecycle(req.params.id, Q.domain);
    res.json(out);
  } catch (e){ next(e); }
});
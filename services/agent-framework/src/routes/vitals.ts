import { Router } from 'express';
import { fetchVitals } from '../services/facts';
export const vitals = Router();
vitals.get('/:id/vitals', async (req,res)=> res.json(await fetchVitals(req.params.id)));
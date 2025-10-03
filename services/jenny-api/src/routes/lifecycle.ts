import { Router } from 'express';
import { fetchLifecycle } from '../services/lifecycle';
export const lifecycle = Router();
lifecycle.get('/:id/lifecycle', async (req,res)=> res.json(await fetchLifecycle(req.params.id)));
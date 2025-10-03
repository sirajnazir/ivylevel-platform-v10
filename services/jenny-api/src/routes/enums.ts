/**
 * Universal Enumerations API Routes
 *
 * Facts-first deterministic SQL endpoints for Awards/ECs/Narrative/Programs
 * Returns 412 Precondition Failed with actionable "need" when data is missing
 */

import { Router } from 'express';
import type { Pool } from 'pg';
import { awards, ecs, narrative, programs } from '../resolvers/enums.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('routes-enums');

export function enumsRouter(pg: Pool) {
  const router = Router();

  // ========================================
  // AWARDS
  // ========================================
  router.get('/students/:id/awards', async (req, res) => {
    const { id } = req.params;
    const { phase, view } = req.query as any;

    log.event('enum_request', { type: 'awards', student_id: id, phase, view });

    try {
      let data;
      if (phase === 'initial') {
        data = await awards.initial(pg, id);
      } else if (phase === 'final') {
        data = await awards.final(pg, id);
      } else if (view === 'progression') {
        data = await awards.progression(pg, id);
      } else {
        return res.status(412).json({
          error: 'no_evidence',
          need: 'phase=initial|final or view=progression'
        });
      }

      if (!data?.length) {
        return res.status(412).json({
          error: 'no_evidence',
          need: 'awards data not found - check award_targets and outcomes tables'
        });
      }

      res.json({ items: data });
    } catch (error: any) {
      log.error('Awards enumeration failed', { error: error.message, student_id: id });
      res.status(500).json({ error: 'internal_error', message: error.message });
    }
  });

  // ========================================
  // ECS / ACTIVITIES
  // ========================================
  router.get('/students/:id/ecs', async (req, res) => {
    const { id } = req.params;
    const { phase, view } = req.query as any;

    log.event('enum_request', { type: 'ecs', student_id: id, phase, view });

    try {
      let data;
      if (phase === 'initial') {
        data = await ecs.initial(pg, id);
      } else if (phase === 'final') {
        data = await ecs.final(pg, id);
      } else if (view === 'progression') {
        data = await ecs.progression(pg, id);
      } else {
        return res.status(412).json({
          error: 'no_evidence',
          need: 'phase=initial|final or view=progression'
        });
      }

      if (!data?.length) {
        return res.status(412).json({
          error: 'no_evidence',
          need: 'ECs data not found - check kb_items table with item_type=ec or activity'
        });
      }

      res.json({ items: data });
    } catch (error: any) {
      log.error('ECs enumeration failed', { error: error.message, student_id: id });
      res.status(500).json({ error: 'internal_error', message: error.message });
    }
  });

  // ========================================
  // NARRATIVE
  // ========================================
  router.get('/students/:id/narrative/initial', async (req, res) => {
    const { id } = req.params;

    log.event('enum_request', { type: 'narrative', student_id: id });

    try {
      const row = await narrative.initial(pg, id);

      if (!row) {
        return res.status(412).json({
          error: 'no_evidence',
          need: 'narrative.initial row in kb_items with item_type=narrative'
        });
      }

      res.json(row);
    } catch (error: any) {
      log.error('Narrative enumeration failed', { error: error.message, student_id: id });
      res.status(500).json({ error: 'internal_error', message: error.message });
    }
  });

  // ========================================
  // SUMMER PROGRAMS
  // ========================================
  router.get('/students/:id/programs', async (req, res) => {
    const { id } = req.params;
    const { phase, view } = req.query as any;

    log.event('enum_request', { type: 'programs', student_id: id, phase, view });

    try {
      let data;
      if (phase === 'initial') {
        data = await programs.initial(pg, id);
      } else if (phase === 'submitted') {
        data = await programs.submitted(pg, id);
      } else if (phase === 'final') {
        data = await programs.decisions(pg, id);
      } else if (view === 'progression') {
        data = await programs.progression(pg, id);
      } else {
        return res.status(412).json({
          error: 'no_evidence',
          need: 'phase=initial|submitted|final or view=progression'
        });
      }

      if (!data?.length) {
        return res.status(412).json({
          error: 'no_evidence',
          need: 'programs data not found - check kb_items (item_type=program) and outcomes tables'
        });
      }

      res.json({ items: data });
    } catch (error: any) {
      log.error('Programs enumeration failed', { error: error.message, student_id: id });
      res.status(500).json({ error: 'internal_error', message: error.message });
    }
  });

  return router;
}

import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';

export const traces = Router();

// Get traces list
traces.get('/', async (req, res) => {
  const { student_id, limit = 50 } = req.query as any;
  const pool = req.app.locals.pool as Pool;
  
  try {
    const rows = await pool.query(
      `SELECT * FROM query_traces
       WHERE ($1::text IS NULL OR student_id=$1)
       ORDER BY created_at DESC
       LIMIT $2`, 
      [student_id || null, Number(limit)]
    );
    res.json(rows.rows);
  } catch (error: any) {
    console.error('Failed to fetch traces:', error);
    res.status(500).json({ error: 'Failed to fetch traces' });
  }
});

// Get specific trace with events and artifacts
traces.get('/:id', async (req, res) => {
  const id = req.params.id;
  const pool = req.app.locals.pool as Pool;
  
  try {
    const t = await pool.query(`SELECT * FROM query_traces WHERE trace_id=$1`, [id]);
    if (t.rowCount === 0) return res.status(404).json({ error: 'not_found' });
    
    const events = await pool.query(
      `SELECT * FROM query_trace_events WHERE trace_id=$1 ORDER BY ts ASC`, 
      [id]
    );
    
    const artifacts = await pool.query(
      `SELECT kind, content, created_at FROM query_trace_artifacts WHERE trace_id=$1 ORDER BY created_at ASC`, 
      [id]
    );
    
    res.json({ 
      trace: t.rows[0], 
      events: events.rows, 
      artifacts: artifacts.rows 
    });
  } catch (error: any) {
    console.error('Failed to fetch trace details:', error);
    res.status(500).json({ error: 'Failed to fetch trace details' });
  }
});

// Minimal "replay": rerun with same inputs quickly (no DB writes if you prefer)
traces.post('/:id/replay', async (req, res) => {
  const id = req.params.id;
  const pool = req.app.locals.pool as Pool;
  
  try {
    const t = await pool.query(`SELECT * FROM query_traces WHERE trace_id=$1`, [id]);
    if (t.rowCount === 0) return res.status(404).json({ error: 'not_found' });
    
    const { q, student_id, llm_model } = t.rows[0];
    
    // Import orchestrate function
    const { orchestrate } = await import('../orchestrator/index.js');
    
    // Get services from app locals
    const pinecone = req.app.locals.pinecone;
    const composer = req.app.locals.composer;
    const search = req.app.locals.search;
    
    try {
      const result = await orchestrate(
        q, 
        student_id, 
        { week: undefined, model: llm_model }, 
        { pool, pinecone, composer, search }
      );
      res.json({ replay_of: id, result });
    } catch (e: any) {
      res.status(500).json({ error: 'replay_failed', message: e.message });
    }
  } catch (error: any) {
    console.error('Failed to replay trace:', error);
    res.status(500).json({ error: 'Failed to replay trace' });
  }
});
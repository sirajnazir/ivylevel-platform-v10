import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '2mb' }));

// CORS for test server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel'
});

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Simple vitals endpoint
app.get('/students/:id/vitals', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fact_id, kind, value, fact_date, confidence, source_id 
       FROM vital_facts 
       WHERE student_id = $1
       ORDER BY fact_date DESC`,
      [req.params.id]
    );
    res.json({ facts: result.rows });
  } catch (error: any) {
    console.error('Vitals error:', error);
    res.status(500).json({ error: 'vitals_failed' });
  }
});

// Simple search endpoint
app.post('/search', async (req, res) => {
  try {
    const { q, student_id = 'huda-2025' } = req.body;
    console.log('[Search] Query:', q, 'Student:', student_id);
    
    // Get vitals
    const vitalsResult = await pool.query(
      `SELECT fact_id, kind, value, fact_date, confidence, source_id 
       FROM vital_facts 
       WHERE student_id = $1
       ORDER BY confidence DESC, fact_date DESC`,
      [student_id]
    );
    
    const vitals = { facts: vitalsResult.rows };
    console.log('[Search] Found', vitals.facts.length, 'facts');
    
    // Find SAT score - look for the value 1530 or highest confidence sat_total_score
    const satScoreFact = vitals.facts.find(f => 
      f.kind === 'sat_total_score' && (f.value === '1530' || parseInt(f.value) > 1000)
    ) || vitals.facts.find(f => f.kind === 'sat_total_score');
    
    // For now, just return a simple response
    const answer = `I found ${vitals.facts.length} facts about you. Your most recent SAT score is ${
      satScoreFact?.value || 'not found'
    }.`;
    
    res.json({
      answer,
      vitals,
      chips: [],
      hits: []
    });
    
  } catch (error: any) {
    console.error('[Search] Error:', error);
    res.status(500).json({ error: 'search_failed', message: error.message });
  }
});

// Evidence endpoint (stub)
app.get('/evidence', async (req, res) => {
  res.json([]);
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Jenny API (simple) running on :${PORT}`);
});
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: ['http://localhost:3000'], credentials: false }));

const JENNY_API_BASE = process.env.JENNY_API_BASE || 'http://localhost:8787';
const API_KEY = process.env.API_KEY; // if your v3 API enforces it

function headers() {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (API_KEY) h['X-API-Key'] = API_KEY;
  return h;
}

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Chat endpoint that UI calls
app.post('/agent/chat', async (req, res) => {
  try {
    const { message, student_id, week, llm_model } = req.body ?? {};
    if (!message || !student_id) return res.status(400).json({ error: 'missing message/student_id' });

    console.log('[Test Server] Proxying chat to Jenny API:', { message: message.substring(0, 50), student_id });

    // v3 orchestrated search: facts-first -> hybrid -> chips -> compose
    const resp = await fetch(`${JENNY_API_BASE}/search`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ q: message, student_id, week, llm_model })
    });

    // Pass through trace ID
    const traceId = resp.headers.get('X-Trace-Id');
    if (traceId) {
      res.setHeader('X-Trace-Id', traceId);
      console.log('[Test Server] Trace ID:', traceId);
    }

    const data = await resp.json();
    console.log('[Test Server] Response shape:', { 
      hasAnswer: !!data.answer, 
      hits: data.hits?.length, 
      chips: data.chips?.length,
      facts: data.vitals?.facts?.length 
    });
    
    // Pass-through shape expected by the new UI:
    // { answer?, hits[], chips[], vitals:{facts[]}, meta? }
    return res.status(resp.status).json(data);
  } catch (e: any) {
    console.error('[Test Server] agent/chat failed:', e?.message);
    return res.status(500).json({ error: 'agent_chat_failed', details: e?.message });
  }
});

// Optional passthroughs used by the UI
app.get('/students/:id/vitals', async (req, res) => {
  console.log('[Test Server] Fetching vitals for:', req.params.id);
  const r = await fetch(`${JENNY_API_BASE}/students/${req.params.id}/vitals`, { headers: headers() });
  const data = await r.json();
  console.log('[Test Server] Vitals response:', { facts: (data as any).facts?.length });
  res.status(r.status).json(data);
});

app.get('/evidence', async (req, res) => {
  console.log('[Test Server] Resolving evidence:', req.query);
  const r = await fetch(`${JENNY_API_BASE}/evidence?${new URLSearchParams(req.query as any)}`, { headers: headers() });
  res.status(r.status).json(await r.json());
});

// Legacy endpoint for backward compatibility
app.get('/students/:id/state', async (req, res) => {
  // Redirect to vitals endpoint
  const r = await fetch(`${JENNY_API_BASE}/students/${req.params.id}/vitals`, { headers: headers() });
  const vitals = await r.json();
  
  // Transform to legacy format if needed
  const legacyFormat = {
    academics: {
      sat: {
        current: vitals.facts?.find((f: any) => f.kind === 'sat_total_score')?.value || 0,
        facts: vitals.facts || []
      }
    }
  };
  res.json(legacyFormat);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`[Test Server] Running on :${port}`);
  console.log(`[Test Server] Proxying to Jenny API at: ${JENNY_API_BASE}`);
  console.log(`[Test Server] API Key: ${API_KEY ? 'configured' : 'not configured'}`);
});
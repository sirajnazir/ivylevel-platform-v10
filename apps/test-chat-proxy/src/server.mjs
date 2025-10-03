import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import morgan from 'morgan';
import * as rfs from 'rotating-file-stream';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;
const JENNY_API_BASE = process.env.JENNY_API_BASE || 'http://localhost:8787';
const API_KEY = process.env.API_KEY || '';
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const accessLogStream = rfs.createStream('access.log', { size: '10M', interval: '1d', path: LOG_DIR });

app.use(cors({ origin: ORIGINS, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(':date[iso] :method :url :status :res[content-length] - :response-time ms', { stream: accessLogStream }));
app.use(morgan('dev'));

function upstreamHeaders(req) {
  const h = { 'content-type': 'application/json' };
  if (API_KEY) h['X-API-Key'] = API_KEY;
  const incomingTrace = req.headers['x-trace-id'];
  if (incomingTrace) h['X-Trace-Id'] = String(incomingTrace);
  return h;
}

// helper that captures response headers (esp. X-Trace-Id) and returns JSON + traceId
async function forwardJson(req, url, init) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  const traceId = res.headers.get('x-trace-id') || '';
  return { status: res.status, data, traceId };
}

app.get('/ping', (_req, res) => res.json({ ok: true, target: JENNY_API_BASE }));

// Chat → Jenny /search
app.post('/agent/chat', async (req, res) => {
  try {
    const { message, student_id, week, llm_model } = req.body || {};
    const body = { q: message, student_id, week, llm_model };
    const { status, data, traceId } = await forwardJson(req, `${JENNY_API_BASE}/search`, {
      method: 'POST',
      headers: upstreamHeaders(req),
      body: JSON.stringify(body)
    });
    if (traceId) res.setHeader('X-Trace-Id', traceId);
    res.status(status).json({ trace_id: traceId, ...data });
  } catch (e) {
    console.error('[proxy] /agent/chat failed:', e?.message);
    res.status(500).json({ error: 'agent_chat_failed' });
  }
});

// Vitals passthrough
app.get('/students/:id/vitals', async (req, res) => {
  const { status, data, traceId } = await forwardJson(req, `${JENNY_API_BASE}/students/${req.params.id}/vitals`, {
    method: 'GET',
    headers: upstreamHeaders(req)
  });
  if (traceId) res.setHeader('X-Trace-Id', traceId);
  res.status(status).json({ trace_id: traceId, ...data });
});

// Evidence resolver
app.get('/evidence', async (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  const { status, data, traceId } = await forwardJson(req, `${JENNY_API_BASE}/evidence?${qs}`, {
    method: 'GET',
    headers: upstreamHeaders(req)
  });
  if (traceId) res.setHeader('X-Trace-Id', traceId);
  res.status(status).json({ trace_id: traceId, ...data });
});

// Trace viewer passthrough (optional)
app.get('/traces/:id', async (req, res) => {
  const { status, data } = await forwardJson(req, `${JENNY_API_BASE}/traces/${req.params.id}`, {
    method: 'GET',
    headers: upstreamHeaders(req)
  });
  res.status(status).json(data);
});

app.listen(PORT, () => {
  console.log(`[Test Proxy] on :${PORT} → ${JENNY_API_BASE}`);
});
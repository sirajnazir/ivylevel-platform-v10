import type { Pool } from 'pg';
import crypto from 'crypto';

type TraceOpts = {
  sampleRate?: number;        // 0..1
  level?: 'off'|'basic'|'full';
  redact?: boolean;
  stdout?: boolean;
};

export type TraceEventPayload = Record<string, any>;

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\+?\d[\d\s\-()]{7,}\d/g;

function redactValue(v: any): any {
  if (typeof v === 'string') {
    return v.replace(EMAIL_RE, '[redacted_email]').replace(PHONE_RE, '[redacted_phone]');
  }
  if (Array.isArray(v)) return v.map(redactValue);
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const k of Object.keys(v)) out[k] = redactValue(v[k]);
    return out;
  }
  return v;
}

export class Tracer {
  constructor(private pool: Pool, private opts: TraceOpts = { sampleRate: 1, level: 'full', redact: true, stdout: true }) {}

  shouldSample() {
    return Math.random() < (this.opts.sampleRate ?? 1);
  }

  newTrace(student_id: string, q: string, routed_mode?: string, llm_model?: string) {
    const trace_id = crypto.randomUUID();
    const startedAt = Date.now();
    let sampled = this.shouldSample();
    
    return {
      trace_id,
      sampled,
      startedAt,
      
      async start() {
        if (!sampled) return;
        const client = await this.pool.connect();
        try {
          await client.query(
            `INSERT INTO query_traces(trace_id, student_id, q, routed_mode, llm_model, status)
             VALUES ($1,$2,$3,$4,$5,'ok')`,
            [trace_id, student_id, q, routed_mode || null, llm_model || null]
          );
          if (this.opts.stdout) {
            console.log(JSON.stringify({ t: trace_id, phase: 'received', student_id, q }));
          }
        } finally {
          client.release();
        }
      },
      
      async event(phase: string, payload?: TraceEventPayload, duration_ms?: number, success: boolean = true) {
        if (!sampled) return;
        const red = this.opts.redact ? redactValue(payload ?? {}) : (payload ?? {});
        const client = await this.pool.connect();
        try {
          await client.query(
            `INSERT INTO query_trace_events(trace_id, phase, duration_ms, success, payload)
             VALUES ($1,$2,$3,$4,$5)`,
            [trace_id, phase, duration_ms ?? null, success, red]
          );
          if (this.opts.stdout) {
            console.log(JSON.stringify({ t: trace_id, phase, duration_ms, success, payload: red }));
          }
        } finally {
          client.release();
        }
      },
      
      async artifact(kind: string, content: any) {
        if (!sampled) return;
        const red = this.opts.redact ? redactValue(content) : content;
        const client = await this.pool.connect();
        try {
          await client.query(
            `INSERT INTO query_trace_artifacts(trace_id, kind, content) VALUES ($1,$2,$3)`,
            [trace_id, kind, red]
          );
        } finally {
          client.release();
        }
      },
      
      async finish(ok: boolean, meta?: { prompt_tokens?: number; completion_tokens?: number; cost_usd?: number }) {
        if (!sampled) return;
        const total_ms = Date.now() - startedAt;
        const client = await this.pool.connect();
        try {
          await client.query(
            `UPDATE query_traces
               SET status = $2,
                   total_ms = $3,
                   prompt_tokens = COALESCE($4, prompt_tokens),
                   completion_tokens = COALESCE($5, completion_tokens),
                   cost_usd = COALESCE($6, cost_usd)
             WHERE trace_id = $1`,
            [trace_id, ok ? 'ok' : 'error', total_ms, meta?.prompt_tokens ?? null, meta?.completion_tokens ?? null, meta?.cost_usd ?? null]
          );
          if (this.opts.stdout) {
            console.log(JSON.stringify({ t: trace_id, phase: 'responded', total_ms, ok }));
          }
        } finally {
          client.release();
        }
      },
      
      async fail(error_message: string) {
        if (!sampled) return;
        const client = await this.pool.connect();
        try {
          await client.query(
            `UPDATE query_traces SET status='error', error_message=$2 WHERE trace_id=$1`,
            [trace_id, error_message]
          );
          await this.event('error', { error_message }, undefined, false);
        } finally {
          client.release();
        }
      }
    };
  }
}
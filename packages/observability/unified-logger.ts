import pino from 'pino';
import { getContext } from './context.js';

const LOG_PATH = process.env.LOG_JSON_PATH || '/tmp/jenny-unified.log';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_SAMPLING = Number(process.env.LOG_SAMPLING || '1.0'); // 0..1
const LOG_PII = (process.env.LOG_PII || 'mask').toLowerCase();   // mask|allow

const transport = pino.transport({
  targets: [
    { target: 'pino-pretty', level: LOG_LEVEL, options: { colorize: true } },
    { target: 'pino/file', level: LOG_LEVEL, options: { destination: LOG_PATH } }
  ]
});

export function createLogger(component: string) {
  const base = { component, svc: process.env.SERVICE_NAME || 'jenny-api' };
  const logger = pino({ 
    level: LOG_LEVEL.toLowerCase(), // pino expects lowercase
    base 
  }, transport);

  function redact(value: unknown) {
    if (LOG_PII === 'allow') return value;
    if (typeof value === 'string') return value.replace(/(@\w+|[\w._%+-]+@[\w.-]+\.\w+)/g, '[redacted]');
    return value;
  }

  function sampled() {
    return Math.random() <= LOG_SAMPLING;
  }

  function event(event: string, meta: Record<string, any> = {}, level: pino.Level = 'info') {
    if (!sampled()) return;
    const ctx = getContext();
    logger[level]({
      event,
      trace_id: ctx.trace_id,
      session_id: ctx.session_id,
      student_id: ctx.student_id,
      request_id: ctx.request_id,
      route: ctx.route,
      ...meta,
    });
  }

  return {
    raw: logger,
    event,
    error: (eventName: string, err: any, meta: Record<string, any> = {}) =>
      event(eventName, { ...meta, error: serializeErr(err) }, 'error'),
    redact,
  };
}

function serializeErr(err: any) {
  return {
    message: err?.message,
    name: err?.name,
    code: err?.code,
    stack: err?.stack
  };
}
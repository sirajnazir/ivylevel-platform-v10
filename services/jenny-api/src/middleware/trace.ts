import { Tracer } from '../observability/tracer.js';
import type { Pool } from 'pg';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Locals {
      trace?: any;
    }
  }
}

export function traceMiddleware(pool: Pool) {
  if (!pool) {
    console.warn('Trace middleware: pool is undefined, tracing disabled');
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  
  const tracer = new Tracer(pool, {
    sampleRate: Number(process.env.TRACE_SAMPLE_RATE ?? 1),
    level: (process.env.TRACE_LEVEL as any) ?? 'full',
    redact: process.env.TRACE_REDACT !== '0',
    stdout: process.env.TRACE_STDOUT !== '0'
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    const student_id = (req.body?.student_id || req.query?.student_id || 'unknown') as string;
    const q = (req.body?.q || req.body?.message || req.query?.q || req.path) as string;
    const llm_model = (req.body?.llm_model || process.env.JENNY_LLM_MODEL) as string;

    const t = tracer.newTrace(student_id, q, undefined, llm_model);
    await t.start();

    res.locals.trace = t;
    res.setHeader('X-Trace-Id', t.trace_id);

    res.on('finish', async () => {
      if (res.statusCode >= 500) {
        await t.fail(`http_${res.statusCode}`);
      } else {
        await t.finish(true);
      }
    });

    next();
  };
}
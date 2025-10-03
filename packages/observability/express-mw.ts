import { Request, Response, NextFunction } from 'express';
import { createLogger } from './unified-logger.js';
import { withContext, enrichContext } from './context.js';
import { randomUUID } from 'crypto';

const log = createLogger('http');

export function requestContext() {
  return function (req: Request, res: Response, next: NextFunction) {
    const trace_id = (req.headers['x-trace-id'] as string) || randomUUID();
    const request_id = randomUUID();
    const session_id = (req.body?.session_id || req.query?.session_id) as string | undefined;
    const student_id = (req.body?.student_id || req.query?.student_id) as string | undefined;

    const start = Date.now();
    const route = `${req.method} ${req.path}`;

    withContext({ trace_id, request_id, session_id, student_id, route, user_agent: req.headers['user-agent'] as string }, () => {
      log.event('request_start', {
        method: req.method,
        path: req.path,
        query: req.query,
      }, 'debug');

      res.on('finish', () => {
        const duration_ms = Date.now() - start;
        log.event('request_end', {
          status: res.statusCode,
          duration_ms,
        }, res.statusCode >= 500 ? 'error' : 'info');
      });

      next();
    });
  };
}

export function attachContext(partial: Partial<{ session_id: string; student_id: string }>) {
  enrichContext(partial);
}
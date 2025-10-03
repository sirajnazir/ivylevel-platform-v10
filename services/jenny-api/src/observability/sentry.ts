import * as Sentry from '@sentry/node';
export function initSentry(app:any){
  if(!process.env.SENTRY_DSN) return;
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
  // v8 SDK uses different API
  app.use((req:any, res:any, next:any) => {
    res.on('finish', () => {
      // Basic request tracking
      if (res.statusCode >= 400) {
        Sentry.captureMessage(`HTTP ${res.statusCode} on ${req.path}`, 'warning');
      }
    });
    next();
  });
}
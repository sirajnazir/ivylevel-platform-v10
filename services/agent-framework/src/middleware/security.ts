import rateLimit from 'express-rate-limit';
export const withRateLimit = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_RPM || 120),
  standardHeaders: true, legacyHeaders: false
});
export function withApiKey(req:any,res:any,next:any){
  const expected = process.env.API_KEY;
  if (!expected) return next(); // dev mode
  const got = req.header('X-API-Key');
  if (got !== expected) return res.status(401).json({ error:'unauthorized' });
  next();
}
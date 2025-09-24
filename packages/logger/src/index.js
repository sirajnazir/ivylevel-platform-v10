import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR))
    fs.mkdirSync(LOG_DIR, { recursive: true });
const transport = pino.transport({
    targets: [
        { target: 'pino-pretty', level: process.env.LOG_LEVEL || 'debug', options: { colorize: true } },
        { target: 'pino/file', level: process.env.LOG_LEVEL || 'debug', options: { destination: path.join(LOG_DIR, 'app.log') } }
    ]
});
export const logger = pino({ name: process.env.SERVICE_NAME || 'ivylevel', level: process.env.LOG_LEVEL || 'debug' }, transport);
export function child(meta) { return logger.child(meta); }

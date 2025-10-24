/**
 * PM2 Ecosystem Configuration for v3.2 Workers
 * Purpose: Supervised worker processes with health checks and auto-restart
 * 
 * Start: pm2 start workers.ecosystem.config.js
 * Status: pm2 status
 * Logs: pm2 logs
 * Stop: pm2 stop workers.ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'outbox-processor',
      script: 'dist/workers/outbox-processor.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        WORKER_NAME: 'outbox-processor',
        REDIS_URL: 'redis://localhost:6379/0',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/ivylevel',
      },
      error_file: '../../logs/outbox-processor-error.log',
      out_file: '../../logs/outbox-processor-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Health check: restart if outbox backlog > 1000
      min_uptime: '10s',
      max_restarts: 10,
    },

    {
      name: 'mv-refresher',
      script: 'dist/workers/mv-refresher.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      cron_restart: '*/5 * * * *', // Restart every 5 minutes to ensure freshness
      env: {
        NODE_ENV: 'production',
        WORKER_NAME: 'mv-refresher',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/ivylevel',
        REFRESH_INTERVAL_MS: '300000', // 5 minutes
      },
      error_file: '../../logs/mv-refresher-error.log',
      out_file: '../../logs/mv-refresher-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    {
      name: 'eq-auditor',
      script: 'dist/workers/eq-auditor.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        WORKER_NAME: 'eq-auditor',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/ivylevel',
        SIMILARITY_THRESHOLD: '0.85',
        ALERT_ON_FALLBACK: 'true',
      },
      error_file: '../../logs/eq-auditor-error.log',
      out_file: '../../logs/eq-auditor-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};

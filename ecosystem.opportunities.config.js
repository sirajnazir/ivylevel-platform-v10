module.exports = {
  apps: [
    {
      name: 'opportunity-catalog',
      script: './services/opportunity-catalog/dist/index.js',
      cwd: './services/opportunity-catalog',
      env: {
        NODE_ENV: 'production',
        PORT: 4202,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://saadnazir@localhost/ivylevel'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/opportunity-catalog-error.log',
      out_file: './logs/opportunity-catalog-out.log',
      log_file: './logs/opportunity-catalog-combined.log',
      time: true
    },
    {
      name: 'opportunity-scorer',
      script: './services/opportunity-scorer/dist/index.js',
      cwd: './services/opportunity-scorer',
      env: {
        NODE_ENV: 'production',
        PORT: 4203,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://saadnazir@localhost/ivylevel',
        API_URL: 'http://localhost:4000',
        CATALOG_URL: 'http://localhost:4202'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/opportunity-scorer-error.log',
      out_file: './logs/opportunity-scorer-out.log',
      log_file: './logs/opportunity-scorer-combined.log',
      time: true
    },
    {
      name: 'opportunity-recommender',
      script: './services/opportunity-recommender/dist/index.js',
      cwd: './services/opportunity-recommender',
      env: {
        NODE_ENV: 'production',
        PORT: 4204,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://saadnazir@localhost/ivylevel',
        API_URL: 'http://localhost:4000',
        CATALOG_URL: 'http://localhost:4202',
        SCORER_URL: 'http://localhost:4203'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/opportunity-recommender-error.log',
      out_file: './logs/opportunity-recommender-out.log',
      log_file: './logs/opportunity-recommender-combined.log',
      time: true
    }
  ]
};
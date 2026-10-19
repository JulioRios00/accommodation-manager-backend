// PM2 config for the EC2 box. The process is named `backend` — that is what is actually
// running (`pm2 status`), and it matches backend/ecosystem.config.js. This file used to
// say `accommodation-manager`, which matched nothing.
//
// cwd must be the Nest app directory, not the repo root: the app calls dotenv/config,
// which loads .env relative to the working directory. Since the repo was restructured
// the app lives in backend/, so .env belongs at <repo>/backend/.env.
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/main.js',
      cwd: '/home/ubuntu/app/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Logs
      out_file: '/home/ubuntu/logs/app-out.log',
      error_file: '/home/ubuntu/logs/app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

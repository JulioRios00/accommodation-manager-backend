module.exports = {
  apps: [
    {
      name: 'accommodation-manager',
      script: 'dist/main.js',
      cwd: '/home/ubuntu/app',
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

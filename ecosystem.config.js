module.exports = {
  apps: [
    {
      name: 'backend-api',
      script: 'dist/server.js',
      cwd: __dirname,
      env: { NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      autorestart: true,
    },
    {
      name: 'backend-worker',
      script: 'dist/worker.js',
      cwd: __dirname,
      env: { NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      autorestart: true,
    },
  ],
}

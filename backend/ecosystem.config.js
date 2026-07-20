/**
 * PM2 Ecosystem Configuration for GENZ WhatsApp Backend
 * 
 * This file configures PM2 for process management in production
 * Usage: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'genz-whatsapp-backend',
      script: './server.js',
      instances: 1, // Set to 'max' for cluster mode with CPU cores
      exec_mode: 'fork', // Use 'cluster' for multiple instances
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Health check
      health_check_grace_period: 3000
    }
  ],
  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/genz-whatsapp.git',
      path: '/var/www/genz-whatsapp',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};

module.exports = {
  apps: [
    {
      name: 'shorty-api',
      script: './dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 1877,
        AUTO_REFRESH_HOURS: 12,
        CACHE_DIR: './data',
      },
    },
  ],
};

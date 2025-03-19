module.exports = {
  apps: [{
    name: 'witetec-backend',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    node_args: '--max-old-space-size=2048',
    exp_backoff_restart_delay: 100,
    kill_timeout: 3000,
    wait_ready: true,
    listen_timeout: 10000,
    max_restarts: 10,
  }]
}
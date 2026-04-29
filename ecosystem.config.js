module.exports = {
  apps: [
    {
      name: "livesoko-api",
      script: "./backend/index.js",
      instances: 1, // Stick to 1 instance for SQLite write concurrency safety
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DB_PATH: "/data/livesoko.db" // Oracle Cloud persistent volume mount path
      }
    }
  ]
};

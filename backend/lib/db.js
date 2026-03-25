const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Direct PostgreSQL connection - bypasses PostgREST entirely
// Connection string format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

module.exports = { pool };

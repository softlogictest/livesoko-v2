const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

// DB_PATH env var lets Railway point this at a persistent volume (/data/dukalive.db)
// Falls back to the local dukalive.db in development
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'dukalive.db');
let db;

function init() {
  // Ensure the directory for the database exists (crucial for Railway volumes)
  const fs = require('fs');
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // WAL mode for crash safety and better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create all tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL CHECK (role IN ('seller', 'handyman')) DEFAULT 'seller',
      shop_name TEXT,
      tiktok_handle TEXT,
      mpesa_number TEXT,
      seller_id TEXT REFERENCES profiles(id),
      webhook_token TEXT UNIQUE,
      sheet_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      seller_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      seller_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      buyer_name TEXT NOT NULL,
      buyer_tiktok TEXT NOT NULL,
      buyer_phone TEXT NOT NULL,
      delivery_location TEXT NOT NULL,
      coordinates TEXT,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      unit_price REAL NOT NULL,
      expected_amount REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
      mpesa_sender_name TEXT,
      mpesa_amount REAL,
      mpesa_tx_code TEXT UNIQUE,
      mpesa_raw_sms TEXT,
      mpesa_received_at TEXT,
      payment_type TEXT NOT NULL DEFAULT 'MPESA' CHECK (payment_type IN ('MPESA', 'COD')),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'COD_PENDING', 'VERIFIED', 'FRAUD', 'REVIEW', 'FULFILLED')
      ),
      status_reason TEXT,
      fulfilled_at TEXT,
      fulfilled_by TEXT REFERENCES profiles(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sms_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      seller_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      raw_body TEXT NOT NULL,
      sender_number TEXT,
      matched_order_id TEXT REFERENCES orders(id),
      match_status TEXT NOT NULL CHECK (
        match_status IN ('MATCHED', 'UNMATCHED', 'DUPLICATE', 'PARSE_ERROR')
      ),
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
    CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_mpesa_tx ON orders(mpesa_tx_code);
    CREATE INDEX IF NOT EXISTS idx_sessions_seller_status ON sessions(seller_id, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
    CREATE INDEX IF NOT EXISTS idx_sms_logs_seller_id ON sms_logs(seller_id);
    CREATE INDEX IF NOT EXISTS idx_profiles_seller_id ON profiles(seller_id);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
  `);

  // Migration: rebuild orders table if it lacks COD_PENDING or payment_type
  // Uses CREATE new → copy → DROP old → RENAME pattern with foreign_keys=OFF
  // to prevent SQLite from rewriting FK references in sms_logs
  const orderCols = db.prepare(`PRAGMA table_info(orders)`).all();
  const hasPaymentType = !!orderCols.find(c => c.name === 'payment_type');
  const tableSQL = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'`).get();
  const hasCodPending = tableSQL && tableSQL.sql.includes('COD_PENDING');

  if (!hasPaymentType || !hasCodPending) {
    console.log('[DB] Migrating orders table...');
    db.pragma('foreign_keys = OFF');
    db.exec(`
      DROP TABLE IF EXISTS orders_old;
      DROP TABLE IF EXISTS orders_new;

      CREATE TABLE orders_new (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        seller_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        buyer_name TEXT NOT NULL,
        buyer_tiktok TEXT NOT NULL,
        buyer_phone TEXT NOT NULL,
        delivery_location TEXT NOT NULL,
        coordinates TEXT,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        unit_price REAL NOT NULL,
        expected_amount REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
        payment_type TEXT NOT NULL DEFAULT 'MPESA' CHECK (payment_type IN ('MPESA', 'COD')),
        mpesa_sender_name TEXT,
        mpesa_amount REAL,
        mpesa_tx_code TEXT UNIQUE,
        mpesa_raw_sms TEXT,
        mpesa_received_at TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
          status IN ('PENDING', 'COD_PENDING', 'VERIFIED', 'FRAUD', 'REVIEW', 'FULFILLED')
        ),
        status_reason TEXT,
        fulfilled_at TEXT,
        fulfilled_by TEXT REFERENCES profiles(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO orders_new (
        id, session_id, seller_id, buyer_name, buyer_tiktok, buyer_phone,
        delivery_location, coordinates, item_name, quantity, unit_price,
        payment_type, mpesa_sender_name, mpesa_amount, mpesa_tx_code,
        mpesa_raw_sms, mpesa_received_at, status, status_reason,
        fulfilled_at, fulfilled_by, created_at, updated_at
      )
      SELECT
        id, session_id, seller_id, buyer_name, buyer_tiktok, buyer_phone,
        delivery_location, coordinates, item_name, quantity, unit_price,
        COALESCE(payment_type, 'MPESA'), mpesa_sender_name, mpesa_amount, mpesa_tx_code,
        mpesa_raw_sms, mpesa_received_at, status, status_reason,
        fulfilled_at, fulfilled_by, created_at, updated_at
      FROM orders;

      DROP TABLE orders;
      ALTER TABLE orders_new RENAME TO orders;

      CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
      CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);
    db.pragma('foreign_keys = ON');
    console.log('[DB] Migration complete.');
  }

  // Migration: add buyer_mpesa_name column if missing (no constraint = safe ALTER TABLE)
  const orderColNames = db.prepare(`PRAGMA table_info(orders)`).all().map(c => c.name);
  if (!orderColNames.includes('buyer_mpesa_name')) {
    db.exec(`ALTER TABLE orders ADD COLUMN buyer_mpesa_name TEXT`);
    console.log('[DB] Migrated: added buyer_mpesa_name column');
  }

  // Migration: add expires_at column to auth_tokens (backward compatible, no constraint)
  const tokenColNames = db.prepare(`PRAGMA table_info(auth_tokens)`).all().map(c => c.name);
  if (!tokenColNames.includes('expires_at')) {
    db.exec(`ALTER TABLE auth_tokens ADD COLUMN expires_at TEXT`);
    // Set a 7-day expiry on all existing tokens from now
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`UPDATE auth_tokens SET expires_at = ?`).run(expiry);
    console.log('[DB] Migrated: added expires_at to auth_tokens, existing tokens expire in 7 days');
  }

  // Migration: rebuild sms_logs to fix corrupted FK references from old ALTER TABLE migrations
  try {
    const smsCheck = db.prepare(`PRAGMA foreign_key_check(sms_logs)`).all();
    if (smsCheck.length > 0) {
      console.log('[DB] sms_logs FK corruption detected — rebuilding...');
      db.pragma('foreign_keys = OFF');
      db.exec(`
        DROP TABLE IF EXISTS sms_logs_old;
        ALTER TABLE sms_logs RENAME TO sms_logs_old;
        CREATE TABLE sms_logs (
          id TEXT PRIMARY KEY,
          seller_id TEXT NOT NULL,
          raw_sms TEXT,
          parsed_amount REAL,
          parsed_tx_code TEXT,
          parsed_sender TEXT,
          matched_order_id TEXT REFERENCES orders(id),
          match_status TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        INSERT INTO sms_logs SELECT * FROM sms_logs_old;
        DROP TABLE sms_logs_old;
      `);
      db.pragma('foreign_keys = ON');
      console.log('[DB] sms_logs rebuilt with clean FK references.');
    }
  } catch (err) {
    // If sms_logs doesn't exist or rebuild fails, just recreate it cleanly
    db.exec(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL,
        raw_sms TEXT,
        parsed_amount REAL,
        parsed_tx_code TEXT,
        parsed_sender TEXT,
        matched_order_id TEXT REFERENCES orders(id),
        match_status TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  // Create default seller account on first run
  const existing = db.prepare('SELECT id FROM profiles LIMIT 1').get();
  if (!existing) {
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync('dukalive', 10);
    const token = 'tok_' + crypto.randomBytes(6).toString('hex');

    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, must_change_password, role, shop_name, webhook_token)
      VALUES (?, ?, ?, 1, 'seller', 'My VibeSoko Shop', ?)
    `).run(id, 'seller@dukalive.local', hash, token);

    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  DEFAULT SELLER ACCOUNT CREATED            ║');
    console.log('║  Email:    seller@dukalive.local            ║');
    console.log('║  Password: dukalive                         ║');
    console.log('║  (You will be forced to change on login)    ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
  }

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call init() first.');
  return db;
}

module.exports = { init, getDb };

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

// DB_PATH env var lets Railway point this at a persistent volume (/data/livesoko.db)
// Falls back to the local livesoko.db in development
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'livesoko.db');
let db;

function init() {
  // Ensure the directory for the database exists (crucial for Railway volumes)
  const fs = require('fs');
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  console.log(`[DB] Using database at: ${DB_PATH}`);

  // WAL mode for crash safety and better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Security Pillar: Cleanup expired tokens on startup
  try {
    const expiredCount = db.prepare("DELETE FROM auth_tokens WHERE expires_at < datetime('now')").run().changes;
    if (expiredCount > 0) console.log(`[DB] Cleaned up ${expiredCount} expired sessions.`);
  } catch (e) {
    // Column might not exist yet if it's the first run before migration
  }

  // --- MIGRATION: Phase 1 (Create New Tables, Rebuild Profiles, Map Data) ---
  let profileCols;
  try {
    profileCols = db.prepare(`PRAGMA table_info(profiles)`).all().map(c => c.name);
  } catch(e) {
    profileCols = [];
  }

  if (profileCols.length > 0 && !profileCols.includes('enterprise_name')) {
    console.log('[DB] Migrating to Enterprise/Shop model...');
    db.pragma('foreign_keys = OFF');
    
    // 1. Rebuild Profiles
    db.exec(`
      DROP TABLE IF EXISTS profiles_new;
      CREATE TABLE profiles_new (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        must_change_password INTEGER NOT NULL DEFAULT 1,
        role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'seller', 'admin')) DEFAULT 'owner',
        enterprise_name TEXT,
        tiktok_handle TEXT,
        mpesa_number TEXT,
        shop_name TEXT, -- legacy
        seller_id TEXT, -- legacy
        webhook_token TEXT UNIQUE, -- legacy
        sheet_url TEXT, -- legacy
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      INSERT INTO profiles_new (id, email, password_hash, must_change_password, role, enterprise_name, tiktok_handle, mpesa_number, shop_name, seller_id, webhook_token, sheet_url, created_at, updated_at)
      SELECT id, email, password_hash, must_change_password, 
             CASE WHEN role = 'handyman' THEN 'seller' ELSE 'owner' END,
             COALESCE(shop_name, 'My Enterprise'),
             tiktok_handle, mpesa_number, shop_name, seller_id, webhook_token, sheet_url, created_at, updated_at
      FROM profiles;
      
      DROP TABLE profiles;
      ALTER TABLE profiles_new RENAME TO profiles;
    `);

    // 2. Create new tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS shops (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        webhook_token TEXT UNIQUE,
        sheet_url TEXT,
        tier TEXT NOT NULL DEFAULT 'trial' CHECK (tier IN ('trial', 'shop', 'suite')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'suspended')),
        trial_ends_at TEXT,
        subscription_ends_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS shop_users (
        shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('owner', 'manager', 'seller')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (shop_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS subscription_payments (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        mpesa_code TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 3. Migrate Data to new tables
    const shopCount = db.prepare('SELECT count(*) as c FROM shops').get().c;
    if (shopCount === 0) {
      db.exec(`
        INSERT INTO shops (id, owner_id, name, webhook_token, sheet_url, trial_ends_at, created_at, updated_at)
        SELECT id, id, COALESCE(shop_name, 'My Shop'), webhook_token, sheet_url, datetime('now', '+14 days'), created_at, updated_at
        FROM profiles WHERE role = 'owner'
      `);
      db.exec(`
        INSERT INTO shop_users (shop_id, user_id, role, created_at)
        SELECT id, id, 'owner', created_at
        FROM profiles WHERE role = 'owner'
      `);
      db.exec(`
        INSERT INTO shop_users (shop_id, user_id, role, created_at)
        SELECT seller_id, id, 'seller', created_at
        FROM profiles WHERE role = 'seller' AND seller_id IS NOT NULL
      `);
    }

    // 4. Rename columns
    const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
    if (orderCols.includes('seller_id')) {
      db.exec("DROP INDEX IF EXISTS idx_orders_seller_id; ALTER TABLE orders RENAME COLUMN seller_id TO shop_id; CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);");
    }
    
    const sessionCols = db.prepare("PRAGMA table_info(sessions)").all().map(c => c.name);
    if (sessionCols.includes('seller_id')) {
      db.exec("DROP INDEX IF EXISTS idx_sessions_seller_status; ALTER TABLE sessions RENAME COLUMN seller_id TO shop_id; CREATE INDEX IF NOT EXISTS idx_sessions_shop_status ON sessions(shop_id, status);");
    }

    const smsLogCols = db.prepare("PRAGMA table_info(sms_logs)").all().map(c => c.name);
    if (smsLogCols.includes('seller_id')) {
      db.exec("DROP INDEX IF EXISTS idx_sms_logs_seller_id; ALTER TABLE sms_logs RENAME COLUMN seller_id TO shop_id; CREATE INDEX IF NOT EXISTS idx_sms_logs_shop_id ON sms_logs(shop_id);");
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
      CREATE INDEX IF NOT EXISTS idx_shop_users_user ON shop_users(user_id);
    `);
    
    db.pragma('foreign_keys = ON');
    console.log('[DB] Enterprise migration complete.');
  }

  // --- MIGRATION: Phase 2 (Fix Bad Foreign Keys from SQLite RENAME COLUMN limitations) ---
  let badSessionFk = false;
  try {
    badSessionFk = db.prepare("PRAGMA foreign_key_list(sessions)").all().some(fk => fk.from === 'shop_id' && fk.table === 'profiles');
  } catch(e) {}
  
  if (badSessionFk) {
    console.log('[DB] Fixing bad foreign keys for sessions/orders/sms_logs...');
    db.pragma('foreign_keys = OFF');
    
    // Fix sessions
    db.exec(`
      CREATE TABLE sessions_new (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        title TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        ended_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO sessions_new (id, shop_id, title, status, started_at, ended_at, created_at)
      SELECT id, shop_id, title, status, started_at, ended_at, created_at FROM sessions;
      DROP TABLE sessions;
      ALTER TABLE sessions_new RENAME TO sessions;
    `);

    // Fix orders
    db.exec(`
      CREATE TABLE orders_new (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
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
        buyer_mpesa_name TEXT,
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
      INSERT INTO orders_new (id, session_id, shop_id, buyer_name, buyer_tiktok, buyer_phone, delivery_location, coordinates, item_name, quantity, unit_price, payment_type, buyer_mpesa_name, mpesa_sender_name, mpesa_amount, mpesa_tx_code, mpesa_raw_sms, mpesa_received_at, status, status_reason, fulfilled_at, fulfilled_by, created_at, updated_at)
      SELECT id, session_id, shop_id, buyer_name, buyer_tiktok, buyer_phone, delivery_location, coordinates, item_name, quantity, unit_price, payment_type, buyer_mpesa_name, mpesa_sender_name, mpesa_amount, mpesa_tx_code, mpesa_raw_sms, mpesa_received_at, status, status_reason, fulfilled_at, fulfilled_by, created_at, updated_at FROM orders;
      DROP TABLE orders;
      ALTER TABLE orders_new RENAME TO orders;
    `);

    // Fix sms_logs
    db.exec(`
      CREATE TABLE sms_logs_new (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        sender_number TEXT NOT NULL,
        raw_message TEXT NOT NULL,
        parsed_amount REAL,
        parsed_sender_name TEXT,
        parsed_tx_code TEXT UNIQUE,
        received_at TEXT NOT NULL,
        matched_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO sms_logs_new SELECT * FROM sms_logs;
      DROP TABLE sms_logs;
      ALTER TABLE sms_logs_new RENAME TO sms_logs;
    `);

    db.pragma('foreign_keys = ON');
    console.log('[DB] Bad foreign keys fixed.');
  }

  // Ensure current tables exist for totally new instances
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'seller', 'admin')) DEFAULT 'owner',
      enterprise_name TEXT,
      tiktok_handle TEXT,
      mpesa_number TEXT,
      shop_name TEXT, 
      seller_id TEXT, 
      webhook_token TEXT UNIQUE, 
      sheet_url TEXT, 
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      webhook_token TEXT UNIQUE,
      sheet_url TEXT,
      tier TEXT NOT NULL DEFAULT 'trial' CHECK (tier IN ('trial', 'shop', 'suite')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'suspended')),
      trial_ends_at TEXT,
      subscription_ends_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_users (
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('owner', 'manager', 'seller')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (shop_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS subscription_payments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      mpesa_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
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
      buyer_mpesa_name TEXT,
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

    CREATE TABLE IF NOT EXISTS sms_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      raw_body TEXT NOT NULL,
      sender_number TEXT,
      matched_order_id TEXT REFERENCES orders(id),
      match_status TEXT NOT NULL CHECK (
        match_status IN ('MATCHED', 'UNMATCHED', 'DUPLICATE', 'PARSE_ERROR')
      ),
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      name TEXT,
      sender_number TEXT NOT NULL,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(shop_id, sender_number)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
    CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_mpesa_tx ON orders(mpesa_tx_code);
    CREATE INDEX IF NOT EXISTS idx_sessions_shop_status ON sessions(shop_id, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
    CREATE INDEX IF NOT EXISTS idx_sms_logs_shop_id ON sms_logs(shop_id);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
    CREATE INDEX IF NOT EXISTS idx_shop_users_user ON shop_users(user_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS unmatched_payments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      mpesa_code TEXT NOT NULL UNIQUE,
      mpesa_amount REAL NOT NULL,
      mpesa_sender TEXT,
      raw_sms TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LINKED', 'IGNORE')),
      linked_order_id TEXT REFERENCES orders(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_unmatched_shop ON unmatched_payments(shop_id);
    CREATE INDEX IF NOT EXISTS idx_unmatched_status ON unmatched_payments(status);
  `);

  // Migration: rebuild orders table if it lacks COD_PENDING or payment_type
  // (Leftover from previous migrations, keep for safety of old instances)
  const orderCols = db.prepare(`PRAGMA table_info(orders)`).all();
  const hasPaymentType = !!orderCols.find(c => c.name === 'payment_type');
  let hasCodPending = false;
  try {
     const tableSQL = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'`).get();
     hasCodPending = tableSQL && tableSQL.sql.includes('COD_PENDING');
  } catch(e) {}

  if (!hasPaymentType || !hasCodPending) {
    console.log('[DB] Migrating orders table (payment_type)...');
    db.pragma('foreign_keys = OFF');
    db.exec(`
      DROP TABLE IF EXISTS orders_old;
      DROP TABLE IF EXISTS orders_new;

      CREATE TABLE orders_new (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
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
        id, session_id, shop_id, buyer_name, buyer_tiktok, buyer_phone,
        delivery_location, coordinates, item_name, quantity, unit_price,
        payment_type, mpesa_sender_name, mpesa_amount, mpesa_tx_code,
        mpesa_raw_sms, mpesa_received_at, status, status_reason,
        fulfilled_at, fulfilled_by, created_at, updated_at
      )
      SELECT
        id, session_id, shop_id, buyer_name, buyer_tiktok, buyer_phone,
        delivery_location, coordinates, item_name, quantity, unit_price,
        COALESCE(payment_type, 'MPESA'), mpesa_sender_name, mpesa_amount, mpesa_tx_code,
        mpesa_raw_sms, mpesa_received_at, status, status_reason,
        fulfilled_at, fulfilled_by, created_at, updated_at
      FROM orders;

      DROP TABLE orders;
      ALTER TABLE orders_new RENAME TO orders;

      CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
      CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);
    db.pragma('foreign_keys = ON');
    console.log('[DB] Migration complete.');
  }

  // Migration: add buyer_mpesa_name column if missing (no constraint = safe ALTER TABLE)
  const orderColNames2 = db.prepare(`PRAGMA table_info(orders)`).all().map(c => c.name);
  if (!orderColNames2.includes('buyer_mpesa_name')) {
    db.exec(`ALTER TABLE orders ADD COLUMN buyer_mpesa_name TEXT`);
    console.log('[DB] Migrated: added buyer_mpesa_name column');
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
          shop_id TEXT NOT NULL,
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
    console.warn('[DB] sms_logs check skipped or failed:', err.message);
  }

  // Migration: add hosted page infrastructure (slugs and color schemes)
  const shopCols = db.prepare(`PRAGMA table_info(shops)`).all().map(c => c.name);
  if (!shopCols.includes('slug')) {
    console.log('[DB] Migrating: Adding hosted page columns (slug, color_scheme)...');
    db.exec(`
      ALTER TABLE shops ADD COLUMN slug TEXT;
      ALTER TABLE shops ADD COLUMN color_scheme TEXT DEFAULT 'acid-green';
      CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);
    `);

    // Backfill slugs for existing shops
    const shops = db.prepare('SELECT id, name FROM shops WHERE slug IS NULL').all();
    const updateSlug = db.prepare('UPDATE shops SET slug = ? WHERE id = ?');
    
    shops.forEach(s => {
      let slug = s.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Fallback if name is empty or weird
      if (!slug) slug = s.id.substring(0, 8);
      
      // Handle potential collisions (rare in backfill but safe)
      let finalSlug = slug;
      let counter = 1;
      while (db.prepare('SELECT id FROM shops WHERE slug = ?').get(finalSlug)) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      }
      
      updateSlug.run(finalSlug, s.id);
    });
    console.log(`[DB] Migrated ${shops.length} shops with fresh slugs.`);
  }

  // Create default admin account on first run
  const existing = db.prepare('SELECT id FROM profiles LIMIT 1').get();
  if (!existing) {
    const defaultEmail = process.env.DEFAULT_SELLER_EMAIL || 'admin@livesoko.local';
    const defaultPass = process.env.DEFAULT_SELLER_PASS || 'LiveSoko#2026!'; // Strong default
    const hash = bcrypt.hashSync(defaultPass, 12); 
    const ownerId = crypto.randomUUID();
    const shopId = crypto.randomUUID();
    const token = 'tok_' + crypto.randomBytes(6).toString('hex');

    db.exec('BEGIN TRANSACTION');
    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, must_change_password, role, enterprise_name)
      VALUES (?, ?, ?, 1, 'admin', 'LiveSoko SuperAdmin')
    `).run(ownerId, defaultEmail, hash);

    db.prepare(`
      INSERT INTO shops (id, owner_id, name, webhook_token, trial_ends_at)
      VALUES (?, ?, 'Master Shop', ?, datetime('now', '+30 years'))
    `).run(shopId, ownerId, token);

    db.prepare(`
      INSERT INTO shop_users (shop_id, user_id, role)
      VALUES (?, ?, 'owner')
    `).run(shopId, ownerId);
    db.exec('COMMIT');

    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  INITIAL ADMIN ACCOUNT CREATED             ║');
    console.log(`║  Email:    ${defaultEmail.padEnd(31)} ║`);
    console.log('║  Password: (Check your environment)        ║');
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

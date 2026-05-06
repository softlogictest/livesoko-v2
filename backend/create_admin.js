const bcrypt = require('bcryptjs');
const { getDb, init } = require('./lib/database');
const crypto = require('crypto');

// Initialize to ensure tables exist
const db = init();

const email = process.env.DEFAULT_SELLER_EMAIL || 'admin@livesoko.local';
const password = process.env.DEFAULT_SELLER_PASS || 'King@tessy2123';
const hash = bcrypt.hashSync(password, 12);
const id = crypto.randomUUID();

try {
  db.prepare(`
    INSERT INTO profiles (id, email, password_hash, must_change_password, role, enterprise_name)
    VALUES (?, ?, ?, 0, 'admin', 'LiveSoko SuperAdmin')
  `).run(id, email, hash);
  console.log('Super Admin account created explicitly.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
} catch (e) {
  if (e.message.includes('UNIQUE')) {
    console.log('Super Admin already exists. No action needed.');
    console.log(`Email is likely: ${email}`);
    console.log(`Password is likely: ${password}`);
  } else {
    console.error(e);
  }
}

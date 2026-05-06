const bcrypt = require('bcryptjs');
const { getDb, init } = require('./lib/database');

// Initialize to ensure tables exist
const db = init();

const email = process.env.DEFAULT_SELLER_EMAIL || 'admin@livesoko.local';
const password = process.env.DEFAULT_SELLER_PASS || 'LiveSoko#2026!';
const hash = bcrypt.hashSync(password, 12);

try {
  const result = db.prepare(`
    UPDATE profiles 
    SET password_hash = ?, must_change_password = 0, role = 'admin'
    WHERE email = ?
  `).run(hash, email);

  if (result.changes > 0) {
    console.log('--------------------------------------------------');
    console.log('SUCCESS: Super Admin password has been reset!');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('--------------------------------------------------');
  } else {
    console.log('--------------------------------------------------');
    console.log('ERROR: Super Admin account not found.');
    console.log('Creating a new one instead...');
    console.log('--------------------------------------------------');
    
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, must_change_password, role, enterprise_name)
      VALUES (?, ?, ?, 0, 'admin', 'LiveSoko SuperAdmin')
    `).run(id, email, hash);
    
    console.log('New Super Admin account created.');
  }
} catch (e) {
  console.error('Failed to reset/create admin:', e);
}
process.exit(0);

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../lib/database');
const { body, validationResult } = require('express-validator');

// Password requirements: Min 8 characters (Simplified for user convenience)
const pwdRegex = /^.{8,}$/;

// Helper to fetch user's shops
function getUserShops(db, userId) {
  return db.prepare(`
    SELECT s.id, s.name, s.slug, s.color_scheme, s.tier, s.status, su.role
    FROM shops s
    JOIN shop_users su ON s.id = su.shop_id
    WHERE su.user_id = ?
  `).all(userId);
}

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').matches(pwdRegex).withMessage('Password must be at least 8 characters.'),
  body('enterprise_name').trim().notEmpty().withMessage('Enterprise name is required').isLength({ max: 50 }).escape()
], async (req, res) => {
  // Security Pillar: Block registration if locked down
  if (process.env.ALLOW_REGISTRATION === 'false') {
    return res.status(403).json({ error: 'Public registration is disabled on this instance.' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, enterprise_name } = req.body;
  const db = getDb();
  
  // Check if email already exists
  const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already in use' });
  }

  try {
    const ownerId = crypto.randomUUID();
    const shopId = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 12); // Pillar 1: Strong Hashing (cost 12)
    const webhookToken = 'tok_' + crypto.randomBytes(6).toString('hex');

    db.exec('BEGIN TRANSACTION');

    // Create the Enterprise Profile
    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, must_change_password, role, enterprise_name)
      VALUES (?, ?, ?, 0, 'owner', ?)
    `).run(ownerId, email, hash, enterprise_name);

    // Auto-create their first default shop with a unique slug
    let baseSlug = enterprise_name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'shop-' + crypto.randomBytes(3).toString('hex');
    
    let finalSlug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM shops WHERE slug = ?').get(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    db.prepare(`
      INSERT INTO shops (id, owner_id, name, slug, webhook_token, trial_ends_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+14 days'))
    `).run(shopId, ownerId, enterprise_name, finalSlug, webhookToken);

    // Link owner to the shop
    db.prepare(`
      INSERT INTO shop_users (shop_id, user_id, role)
      VALUES (?, ?, 'owner')
    `).run(shopId, ownerId);

    // Auto-login after registration
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, ownerId, expires);

    db.exec('COMMIT');

    const user = db.prepare('SELECT id, email, role, enterprise_name FROM profiles WHERE id = ?').get(ownerId);
    const shops = getUserShops(db, ownerId);

    res.json({ message: 'Account created', token, user: { ...user, shops } });
  } catch (err) {
    console.error('[REGISTRATION ERROR]', err);
    if (db.inTransaction) db.exec('ROLLBACK');
    // Return specific error message to help debug during this phase
    res.status(500).json({ error: `Registration Failed: ${err.message}` });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(401).json({ error: 'Invalid credentials' });

  const { email, password } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Create auth token with 7-day expiry
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expires);

  const { password_hash, ...profile } = user;
  const shops = getUserShops(db, user.id);

  res.json({ token, user: { ...profile, shops } });
});

// POST /api/auth/change-password
router.post('/change-password', [
  body('new_password').matches(pwdRegex).withMessage('Password must be at least 8 characters.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = getDb();
  const auth = db.prepare(`
    SELECT p.* FROM auth_tokens t
    JOIN profiles p ON t.user_id = p.id
    WHERE t.token = ?
  `).get(token);

  if (!auth) return res.status(401).json({ error: 'Invalid token' });

  const { new_password } = req.body;
  const hash = await bcrypt.hash(new_password, 12);
  db.prepare('UPDATE profiles SET password_hash = ?, must_change_password = 0, updated_at = datetime(?) WHERE id = ?')
    .run(hash, new Date().toISOString(), auth.id);

  const { password_hash, ...profile } = auth;
  profile.must_change_password = 0;
  const shops = getUserShops(db, auth.id);

  res.json({ message: 'Password changed', user: { ...profile, shops } });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = getDb();
  const auth = db.prepare(`
    SELECT p.* FROM auth_tokens t
    JOIN profiles p ON t.user_id = p.id
    WHERE t.token = ?
  `).get(token);

  if (!auth) return res.status(401).json({ error: 'Invalid token' });
  
  const { password_hash, ...profile } = auth;
  const shops = getUserShops(db, auth.id);
  res.json({ user: { ...profile, shops } });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const db = getDb();
    db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);
  }
  res.json({ message: 'Logged out' });
});

module.exports = router;

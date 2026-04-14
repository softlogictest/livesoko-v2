const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../lib/database');
const { body, validationResult } = require('express-validator');

// Password complexity regex: 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').matches(pwdRegex).withMessage('Password must be 8+ chars and include Uppercase, Lowercase, Number, and Special Character (@$!%*?&).'),
  body('shop_name').trim().notEmpty().withMessage('Shop name is required').isLength({ max: 50 }).escape()
], async (req, res) => {
  // Security Pillar: Block registration if locked down
  if (process.env.ALLOW_REGISTRATION === 'false') {
    return res.status(403).json({ error: 'Public registration is disabled on this instance.' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, shop_name } = req.body;
  const db = getDb();
  
  // Check if email already exists
  const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already in use' });
  }

  try {
    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 12); // Pillar 1: Strong Hashing (cost 12)
    const webhookToken = 'tok_' + crypto.randomBytes(6).toString('hex');

    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, must_change_password, role, shop_name, webhook_token)
      VALUES (?, ?, ?, 0, 'seller', ?, ?)
    `).run(id, email, hash, shop_name, webhookToken);

    // Auto-login after registration
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, id, expires);

    const user = db.prepare('SELECT id, email, role, shop_name FROM profiles WHERE id = ?').get(id);
    res.json({ message: 'Account created', token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create account' });
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
  res.json({ token, user: profile });
});

// POST /api/auth/change-password
router.post('/change-password', [
  body('new_password').matches(pwdRegex).withMessage('Password must be 8+ chars and include Uppercase, Lowercase, Number, and Special Character (@$!%*?&).')
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
  res.json({ message: 'Password changed', user: profile });
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

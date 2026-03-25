const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../lib/database');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email.toLowerCase().trim());

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
router.post('/change-password', (req, res) => {
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
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
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

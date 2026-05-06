const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../lib/database');
const { body, validationResult } = require('express-validator');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../lib/email');

// Password requirements: Min 8 characters
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

// Helper: generate a secure URL-safe token
function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').matches(pwdRegex).withMessage('Password must be at least 8 characters.'),
  body('enterprise_name').trim().notEmpty().withMessage('Enterprise name is required').isLength({ max: 50 }).escape()
], async (req, res) => {
  // Security: Block registration if locked down
  if (process.env.ALLOW_REGISTRATION === 'false') {
    return res.status(403).json({ error: 'Public registration is disabled on this instance.' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, enterprise_name, device_id } = req.body;
  const db = getDb();

  // Check if email already exists
  const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already in use' });
  }

  try {
    const ownerId = crypto.randomUUID();
    const shopId = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 12);
    const webhookToken = 'tok_' + crypto.randomBytes(6).toString('hex');
    const verificationToken = makeToken();

    db.exec('BEGIN TRANSACTION');

    // Create the Enterprise Profile (unverified by default)
    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, must_change_password, role, enterprise_name, is_email_verified, email_verification_token, registered_device_id)
      VALUES (?, ?, ?, 0, 'owner', ?, 0, ?, ?)
    `).run(ownerId, email, hash, enterprise_name, verificationToken, device_id || null);

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

    // Auto-login after registration (token still granted so they land on dashboard)
    const token = makeToken();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, ownerId, expires);

    db.exec('COMMIT');

    // Send verification email (non-blocking — don't fail registration if email is slow)
    sendVerificationEmail(email, verificationToken).catch(e =>
      console.error('[EMAIL] Failed to send verification to', email, e)
    );

    const user = db.prepare('SELECT id, email, role, enterprise_name, is_email_verified FROM profiles WHERE id = ?').get(ownerId);
    const shops = getUserShops(db, ownerId);

    res.json({ message: 'Account created. Please verify your email.', token, user: { ...user, shops } });
  } catch (err) {
    console.error('[REGISTRATION ERROR]', err);
    if (db.inTransaction) db.exec('ROLLBACK');
    res.status(500).json({ error: `Registration Failed: ${err.message}` });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Verification token is required.' });

  const db = getDb();
  const profile = db.prepare('SELECT id, email FROM profiles WHERE email_verification_token = ?').get(token);

  if (!profile) {
    return res.status(400).json({ error: 'Invalid or expired verification link.' });
  }

  db.prepare('UPDATE profiles SET is_email_verified = 1, email_verification_token = NULL, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), profile.id);

  console.log(`[AUTH] Email verified for user: ${profile.email}`);
  res.json({ message: 'Email verified successfully. You can now access all features.' });
});

// POST /api/auth/resend-verification
// Rate limited in index.js
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const db = getDb();
  const profile = db.prepare('SELECT id, email, is_email_verified FROM profiles WHERE email = ?').get(email);

  // Always return success to prevent email enumeration
  if (!profile || profile.is_email_verified) {
    return res.json({ message: 'If that email exists and is unverified, a new link has been sent.' });
  }

  const newToken = makeToken();
  db.prepare('UPDATE profiles SET email_verification_token = ? WHERE id = ?').run(newToken, profile.id);
  await sendVerificationEmail(email, newToken).catch(e => console.error('[EMAIL]', e));

  res.json({ message: 'If that email exists and is unverified, a new link has been sent.' });
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
  const token = makeToken();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expires);

  const { password_hash, reset_password_token, reset_password_expires, email_verification_token, ...profile } = user;
  const shops = getUserShops(db, user.id);

  res.json({ token, user: { ...profile, shops } });
});

// POST /api/auth/forgot-password
// Rate limited in index.js
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  // Always return success to prevent email enumeration
  if (!errors.isEmpty()) return res.json({ message: 'If that account exists, a reset link has been sent.' });

  const { email } = req.body;
  const db = getDb();
  const profile = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);

  if (!profile) {
    // Return generic success to prevent enumeration
    return res.json({ message: 'If that account exists, a reset link has been sent.' });
  }

  const resetToken = makeToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare('UPDATE profiles SET reset_password_token = ?, reset_password_expires = ?, updated_at = ? WHERE id = ?')
    .run(resetToken, expires, new Date().toISOString(), profile.id);

  await sendPasswordResetEmail(email, resetToken).catch(e => console.error('[EMAIL]', e));

  console.log(`[AUTH] Password reset requested for: ${email}`);
  res.json({ message: 'If that account exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('new_password').matches(pwdRegex).withMessage('Password must be at least 8 characters.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { token, new_password } = req.body;
  const db = getDb();

  const profile = db.prepare(`
    SELECT id FROM profiles
    WHERE reset_password_token = ?
    AND reset_password_expires > datetime('now')
  `).get(token);

  if (!profile) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  const hash = await bcrypt.hash(new_password, 12);

  db.prepare(`
    UPDATE profiles
    SET password_hash = ?,
        must_change_password = 0,
        reset_password_token = NULL,
        reset_password_expires = NULL,
        updated_at = ?
    WHERE id = ?
  `).run(hash, new Date().toISOString(), profile.id);

  // Invalidate all existing sessions for security
  db.prepare('DELETE FROM auth_tokens WHERE user_id = ?').run(profile.id);

  console.log(`[AUTH] Password reset successfully for user: ${profile.id}`);
  res.json({ message: 'Password reset successfully. Please sign in with your new password.' });
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
  db.prepare('UPDATE profiles SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?')
    .run(hash, new Date().toISOString(), auth.id);

  const { password_hash, reset_password_token, reset_password_expires, email_verification_token, ...profile } = auth;
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

  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { password_hash, reset_password_token, reset_password_expires, email_verification_token, ...profile } = auth;
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

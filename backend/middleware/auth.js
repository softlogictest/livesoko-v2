const { getDb } = require('../lib/database');
const crypto = require('crypto');

const TOKEN_TTL_DAYS = 7;   // tokens live 7 days
const RENEW_IF_UNDER_HOURS = 24; // auto-extend if less than 24h left

// Verifies session token and attaches user to req
// Silently extends the token expiry if it's nearing expiry
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const db = getDb();
  const row = db.prepare(`
    SELECT t.expires_at, p.* FROM auth_tokens t
    JOIN profiles p ON t.user_id = p.id
    WHERE t.token = ?
  `).get(token);

  if (!row) return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });

  // Check expiry (if column exists and is set)
  if (row.expires_at) {
    const expiresAt = new Date(row.expires_at.replace(' ', 'T') + 'Z').getTime();
    if (Date.now() > expiresAt) {
      db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);
      return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }

    // Auto-renew: if less than RENEW_IF_UNDER_HOURS left, extend silently
    const remaining = expiresAt - Date.now();
    if (remaining < RENEW_IF_UNDER_HOURS * 60 * 60 * 1000) {
      const newExpiry = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE auth_tokens SET expires_at = ? WHERE token = ?').run(newExpiry, token);
      res.setHeader('X-Token-Renewed', 'true');
    }
  }

  // Attach user (strip password hash)
  const { password_hash, expires_at, ...user } = row;
  req.user = user;
  next();
};

// Role guard — use after authenticate
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
  }
  next();
};

module.exports = { authenticate, requireRole };

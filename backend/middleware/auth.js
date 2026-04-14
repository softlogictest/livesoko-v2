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

  // Check expiry
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
  
  // Scoping: client must pass x-shop-id header to interact with shop data
  const targetShopId = req.headers['x-shop-id'];
  
  if (targetShopId) {
    const access = db.prepare('SELECT role FROM shop_users WHERE user_id = ? AND shop_id = ?').get(user.id, targetShopId);
    if (!access) {
       if (user.role === 'admin') {
         req.user = { ...user, shop_id: targetShopId, shop_role: 'admin' };
       } else {
         return res.status(403).json({ error: 'You do not have access to this shop', code: 'FORBIDDEN_SHOP' });
       }
    } else {
       req.user = { ...user, shop_id: targetShopId, shop_role: access.role };
    }
  } else {
    // User is authenticated but hasn't selected a shop context yet
    req.user = user;
  }
  
  next();
};

const checkBilling = (req, res, next) => {
  if (!req.user.shop_id) return next(); // If route isn't shop specific
  const db = getDb();
  const shop = db.prepare('SELECT subscription_ends_at, trial_ends_at FROM shops WHERE id = ?').get(req.user.shop_id);
  
  if (!shop) return res.status(404).json({ error: 'Shop not found' });

  const now = new Date().getTime();
  const subEnds = shop.subscription_ends_at ? new Date(shop.subscription_ends_at.replace(' ', 'T') + 'Z').getTime() : 0;
  const trialEnds = shop.trial_ends_at ? new Date(shop.trial_ends_at.replace(' ', 'T') + 'Z').getTime() : 0;

  if (now > subEnds && now > trialEnds) {
    return res.status(402).json({ error: 'Subscription or trial expired.', code: 'PAYMENT_REQUIRED' });
  }

  next();
};

// Role guard — use after authenticate (for global roles like admin)
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
  }
  next();
};

// Shop Role guard - use after authenticate (for shop level access like manager)
const requireShopRole = (roles) => (req, res, next) => {
  if (!req.user.shop_id) return res.status(400).json({ error: 'Shop context required' });
  if (req.user.role === 'admin') return next(); // Super admin overrides

  if (!roles.includes(req.user.shop_role)) {
    return res.status(403).json({ error: 'Forbidden inside this shop', code: 'FORBIDDEN_SHOP_ROLE' });
  }
  next();
};

module.exports = { authenticate, checkBilling, requireRole, requireShopRole };

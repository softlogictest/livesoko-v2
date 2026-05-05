const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/database');
const { body, validationResult } = require('express-validator');

// GET /api/settings — get shop settings and staff list
router.get('/', (req, res) => {
  const db = getDb();
  const shopId = req.user.shop_id; // Added by auth middleware from x-shop-id header

  const shop = db.prepare(`
    SELECT s.*, p.email as owner_email 
    FROM shops s 
    JOIN profiles p ON s.owner_id = p.id 
    WHERE s.id = ?
  `).get(shopId);

  // Get staff for this shop
  const handymen = db.prepare(`
    SELECT p.id, p.email, su.role, p.created_at 
    FROM shop_users su
    JOIN profiles p ON su.user_id = p.id
    WHERE su.shop_id = ?
  `).all(shopId);

  res.json({ seller: shop, handymen });
});

// PATCH /api/settings — update shop configuration
router.patch('/', [
  body('name').optional().trim().isLength({ max: 50 }).escape(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const shopId = req.user.shop_id;
  const { name, slug, color_scheme } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  
  if (slug !== undefined) {
    // Basic slug validation
    const sanitized = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!sanitized) return res.status(400).json({ error: 'Invalid slug' });
    
    // Check for collision
    const existing = db.prepare('SELECT id FROM shops WHERE slug = ? AND id != ?').get(sanitized, shopId);
    if (existing) return res.status(400).json({ error: 'This slug is already taken' });
    
    updates.push('slug = ?'); 
    params.push(sanitized); 
  }

  if (color_scheme !== undefined) {
    const valid = ['acid-green', 'sweet-pink', 'sky-blue', 'hot-lava', 'royal-gold'];
    if (!valid.includes(color_scheme)) return res.status(400).json({ error: 'Invalid color scheme' });
    updates.push('color_scheme = ?');
    params.push(color_scheme);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  updates.push('updated_at = datetime(?)');
  params.push(new Date().toISOString());
  params.push(shopId);

  db.prepare(`UPDATE shops SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
  res.json(updated);
});

// POST /api/settings/handymen — create a new shop staff account
router.post('/handymen', [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').optional().isIn(['manager', 'seller']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const shopId = req.user.shop_id;
  const { email, password, role = 'seller' } = req.body;

  try {
    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');
    
    if (!shopId) {
      console.error('[STAFF ERROR] Missing shopId in request context');
      return res.status(400).json({ error: 'Shop context missing. Please log out and log back in.' });
    }

    // Permission check: only owners/managers/admins can add staff
    if (req.user.role !== 'admin' && req.user.shop_role !== 'owner' && req.user.shop_role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized: Only Managers and Owners can manage staff.' });
    }
    
    // Check if user exists anywhere
    let user = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
    let userId = user?.id;

    db.exec('BEGIN TRANSACTION');

    if (!user) {
      // Create new profile
      userId = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
      const hash = await bcrypt.hash(password, 12);
      db.prepare(`
        INSERT INTO profiles (id, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `).run(userId, email, hash, role === 'manager' ? 'manager' : 'seller');
    }

    // Link user to this shop
    const existingLink = db.prepare('SELECT user_id FROM shop_users WHERE shop_id = ? AND user_id = ?').get(shopId, userId);
    if (existingLink) {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: 'This user is already staff in this shop' });
    }

    db.prepare(`
      INSERT INTO shop_users (shop_id, user_id, role)
      VALUES (?, ?, ?)
    `).run(shopId, userId, role);

    db.exec('COMMIT');
    console.log(`[STAFF] Successfully added ${email} to shop ${shopId} as ${role}`);
    res.status(201).json({ id: userId, email, role, success: true });
  } catch (err) {
    if (db.inTransaction) db.exec('ROLLBACK');
    console.error('[STAFF FATAL ERROR]', err);
    // Return specific error to frontend so we can solve this
    res.status(500).json({ error: `Server Error: ${err.message}` });
  }
});

// GET /api/settings/network — get enterprise topology data for "Shop Tree"
router.get('/network', (req, res) => {
  const db = getDb();
  const shopId = req.user.shop_id;

  const shop = db.prepare('SELECT id, name, slug, color_scheme FROM shops WHERE id = ?').get(shopId);
  const staff = db.prepare(`
    SELECT p.id, COALESCE(p.email, 'User') as label, su.role 
    FROM shop_users su
    JOIN profiles p ON su.user_id = p.id
    WHERE su.shop_id = ?
  `).all(shopId);

  const devices = db.prepare('SELECT id, name, sender_number, last_seen_at FROM devices WHERE shop_id = ?').all(shopId);
  
  // Get counts for orders and SMS to show "Pulse" activity in the last 24h
  const activeOrders = db.prepare("SELECT count(*) as count FROM orders WHERE shop_id = ? AND status = 'PENDING'").get(shopId).count;
  const recentSmsCount = db.prepare("SELECT count(*) as count FROM sms_logs WHERE shop_id = ? AND received_at > datetime('now', '-1 day')").get(shopId).count;

  res.json({
    shop,
    staff,
    devices,
    stats: { activeOrders, recentSmsCount }
  });
});

// PATCH /api/settings/devices/:id — rename a device
router.patch('/devices/:id', [
  body('name').trim().isLength({ min: 1, max: 20 }).escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const shopId = req.user.shop_id;
  const { id } = req.params;
  const { name } = req.body;

  const result = db.prepare('UPDATE devices SET name = ? WHERE id = ? AND shop_id = ?').run(name, id, shopId);
  if (result.changes === 0) return res.status(404).json({ error: 'Device not found' });

  res.json({ success: true, name });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/database');
const { body, validationResult } = require('express-validator');

// Basic manual superadmin check
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'SuperAdmin only.' });
  }
  next();
};

router.use(requireSuperAdmin);

// Add a payment and activate/extend a shop subscription
router.post('/payments', [
  body('shop_id').notEmpty(),
  body('amount').isNumeric(),
  body('mpesa_code').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { shop_id, amount, mpesa_code } = req.body;
  const db = getDb();

  try {
    const crypto = require('crypto');
    const id = crypto.randomUUID();

    db.exec('BEGIN TRANSACTION');

    // 1. Record the payment receipt
    db.prepare(`
      INSERT INTO subscription_payments (id, shop_id, amount, mpesa_code)
      VALUES (?, ?, ?, ?)
    `).run(id, shop_id, amount, mpesa_code);

    // 2. Extend the shop's subscription by 30 days
    // If it's already active, extend from the current end date.
    // If expired, extend 30 days from NOW.
    const shop = db.prepare('SELECT subscription_ends_at FROM shops WHERE id = ?').get(shop_id);
    if (!shop) {
      db.exec('ROLLBACK');
      return res.status(404).json({ error: 'Shop not found' });
    }

    const now = new Date().getTime();
    const currentEnd = shop.subscription_ends_at ? new Date(shop.subscription_ends_at.replace(' ', 'T') + 'Z').getTime() : 0;
    
    // Choose start basis
    const baseDate = currentEnd > now ? currentEnd : now;
    const newEnd = new Date(baseDate + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '');

    db.prepare(`
      UPDATE shops 
      SET subscription_ends_at = ?, status = 'active'
      WHERE id = ?
    `).run(newEnd, shop_id);

    db.exec('COMMIT');
    res.json({ message: 'Payment recorded and subscription extended.', new_expiry: newEnd });
  } catch (e) {
    if (db.inTransaction) db.exec('ROLLBACK');
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'MPESA Code already exists' });
    }
    console.error(e);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../lib/database');
const { body, validationResult } = require('express-validator');
const { broadcast } = require('./events');

// GET /api/public/shop/:slug — Get shop info for the public order page
router.get('/shop/:slug', (req, res) => {
  const db = getDb();
  const shop = db.prepare(`
    SELECT id, name, slug, color_scheme, status 
    FROM shops 
    WHERE slug = ?
  `).get(req.params.slug);

  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  if (shop.status !== 'active') return res.status(403).json({ error: 'This shop is currently inactive' });

  // Safety: Don't provide internal IDs or secrets
  res.json({
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    color_scheme: shop.color_scheme || 'acid-green'
  });
});

// POST /api/public/order — Guest order intake from the hosted page
router.post('/order', [
  body('shop_id').notEmpty().withMessage('Shop ID is required'),
  body('buyer_name').trim().notEmpty().withMessage('Your name is required'),
  body('buyer_phone').trim().notEmpty().withMessage('Phone number is required'),
  body('item_name').trim().notEmpty().withMessage('What are you ordering?'),
  body('quantity').isInt({ min: 1 }).withMessage('Minimum quantity is 1'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Invalid price'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { shop_id, buyer_name, buyer_tiktok, buyer_phone, delivery_location, item_name, quantity, unit_price } = req.body;
  const db = getDb();

  // Find active session for this shop
  const session = db.prepare('SELECT id FROM sessions WHERE shop_id = ? AND status = ?').get(shop_id, 'active');
  if (!session) return res.status(400).json({ error: 'The seller currently has no active session. Please wait until they are live!' });

  // Normalize phone
  let phone = (buyer_phone || '').replace(/[\s\-()]/g, '');
  if (phone.startsWith('07') || phone.startsWith('01')) phone = '+254' + phone.substring(1);
  else if (phone.startsWith('254')) phone = '+' + phone;
  else if (!phone.startsWith('+')) phone = '+254' + phone;

  const id = crypto.randomUUID();

  try {
    db.prepare(`
      INSERT INTO orders (id, session_id, shop_id, buyer_name, buyer_tiktok, buyer_phone, delivery_location, item_name, quantity, unit_price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(
      id, session.id, shop_id,
      buyer_name,
      buyer_tiktok || '@unknown',
      phone,
      delivery_location || 'Not specified',
      item_name,
      parseInt(quantity) || 1,
      parseFloat(unit_price) || 0
    );

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    broadcast('order:new', order);

    res.status(201).json({ success: true, message: 'Order received! Please complete your M-Pesa payment.' });
  } catch (err) {
    console.error('[Public Order Error]', err.message);
    res.status(500).json({ error: 'Failed to submit order. Please try again.' });
  }
});

module.exports = router;

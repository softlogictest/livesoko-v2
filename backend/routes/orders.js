const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../lib/database');
const { body, validationResult } = require('express-validator');
const { broadcast } = require('./events');

router.use((req, res, next) => {
  console.log(`[Orders Router] ${req.method} ${req.url}`);
  next();
});

// GET /api/orders — list orders for the current session or all
router.get('/', (req, res) => {
  const db = getDb();
  const { session_id, status } = req.query;
  const shopId = req.user.shop_id;

  let query = 'SELECT * FROM orders WHERE shop_id = ?';
  const params = [shopId];

  if (session_id) {
    query += ' AND session_id = ?';
    params.push(session_id);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const orders = db.prepare(query).all(...params);
  res.json(orders);
});

// POST /api/orders — create an order (from Google Form webhook or manual)
router.post('/', [
  body('buyer_name').trim().notEmpty().withMessage('Buyer name is required'),
  body('buyer_phone').trim().notEmpty().withMessage('Phone is required'),
  body('item_name').trim().notEmpty().withMessage('Item name is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Price cannot be negative'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { webhook_token, buyer_name, buyer_tiktok, buyer_phone, delivery_location, item_name, quantity, unit_price, payment_type, buyer_mpesa_name } = req.body;

  // Can be called with webhook_token (unauthenticated, for form/sheet intake)
  // or with auth token (authenticated, for manual entry)
  const db = getDb();
  let seller;

  if (webhook_token) {
    seller = db.prepare('SELECT * FROM shops WHERE webhook_token = ?').get(webhook_token);
    if (!seller) return res.status(404).json({ error: 'Invalid webhook token' });
  } else if (req.user) {
    seller = req.user;
  } else {
    return res.status(401).json({ error: 'Auth or webhook_token required' });
  }

  const shopId = seller.shop_id || seller.id;

  // Find active session
  const session = db.prepare('SELECT * FROM sessions WHERE shop_id = ? AND status = ?').get(shopId, 'active');
  if (!session) return res.status(400).json({ error: 'No active session. Start a session first.' });

  // Normalize phone
  let phone = (buyer_phone || '').replace(/[\s\-()]/g, '');
  if (phone.startsWith('07') || phone.startsWith('01')) phone = '+254' + phone.substring(1);
  else if (phone.startsWith('254')) phone = '+' + phone;
  else if (!phone.startsWith('+')) phone = '+254' + phone;

  const id = crypto.randomUUID();
  const paymentType = payment_type === 'COD' ? 'COD' : 'MPESA';
  const initialStatus = paymentType === 'COD' ? 'COD_PENDING' : 'PENDING';

  try {
    db.prepare(`
      INSERT INTO orders (id, session_id, shop_id, buyer_name, buyer_tiktok, buyer_phone, delivery_location, item_name, quantity, unit_price, payment_type, buyer_mpesa_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, session.id, shopId,
      buyer_name || 'Unknown',
      buyer_tiktok || '@unknown',
      phone,
      delivery_location || 'Not specified',
      item_name || 'Unknown item',
      parseInt(quantity) || 1,
      parseFloat(unit_price) || 0,
      paymentType,
      buyer_mpesa_name || null,
      initialStatus
    );

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    broadcast('order:new', order);

    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PATCH /api/orders/:id/fulfill
router.patch('/:id/fulfill', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND shop_id = ?')
    .get(req.params.id, req.user.shop_id);
    
  if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });
  if (!['VERIFIED', 'COD_PENDING'].includes(order.status)) {
    return res.status(400).json({ error: 'Only VERIFIED or COD_PENDING orders can be fulfilled' });
  }

  db.prepare(`
    UPDATE orders SET status = 'FULFILLED', fulfilled_at = datetime(?), fulfilled_by = ?, updated_at = datetime(?) WHERE id = ?
  `).run(new Date().toISOString(), req.user.id, new Date().toISOString(), req.params.id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  broadcast('order:updated', updated);
  res.json(updated);
});

// PATCH /api/orders/:id/flag — manually mark as FRAUD or REVIEW
router.patch('/:id/flag', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND shop_id = ?')
    .get(req.params.id, req.user.shop_id);
    
  if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });
  if (order.status === 'FULFILLED') return res.status(400).json({ error: 'Cannot flag a fulfilled order' });

  const { status, reason } = req.body;
  if (!['REVIEW', 'FRAUD'].includes(status)) {
    return res.status(400).json({ error: 'Status must be REVIEW or FRAUD' });
  }

  db.prepare(`
    UPDATE orders SET status = ?, status_reason = ?, updated_at = datetime(?) WHERE id = ? AND shop_id = ?
  `).run(status, reason || 'Manually flagged by seller', new Date().toISOString(), req.params.id, req.user.shop_id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  broadcast('order:updated', updated);
  res.json(updated);
});

// PATCH /api/orders/:id/unflag — restore a flagged order back to PENDING
router.patch('/:id/unflag', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND shop_id = ?')
    .get(req.params.id, req.user.shop_id);
    
  if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });
  if (!['FRAUD', 'REVIEW'].includes(order.status)) {
    return res.status(400).json({ error: 'Only FRAUD or REVIEW orders can be unflagged' });
  }

  db.prepare(`
    UPDATE orders SET status = 'PENDING', status_reason = 'Flag removed by seller', updated_at = datetime(?) WHERE id = ? AND shop_id = ?
  `).run(new Date().toISOString(), req.params.id, req.user.shop_id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  broadcast('order:updated', updated);
  res.json(updated);
});

// POST /api/orders/:id/verify — manually mark as verified
router.post('/:id/verify', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND shop_id = ?')
    .get(req.params.id, req.user.shop_id);
    
  if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });

  db.prepare(`
    UPDATE orders SET status = 'VERIFIED', status_reason = 'Manually verified', updated_at = datetime(?) WHERE id = ? AND shop_id = ?
  `).run(new Date().toISOString(), req.params.id, req.user.shop_id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  broadcast('order:updated', updated);
  res.json(updated);
});

// PATCH /api/orders/:id — update order details
router.patch('/:id', (req, res) => {
  const { buyer_name, buyer_phone, delivery_location, item_name, unit_price } = req.body;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND shop_id = ?')
    .get(req.params.id, req.user.shop_id);
    
  if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });

  db.prepare(`
    UPDATE orders SET 
      buyer_name = COALESCE(?, buyer_name),
      buyer_phone = COALESCE(?, buyer_phone),
      delivery_location = COALESCE(?, delivery_location),
      item_name = COALESCE(?, item_name),
      unit_price = COALESCE(?, unit_price),
      updated_at = datetime(?) 
    WHERE id = ? AND shop_id = ?
  `).run(
    buyer_name,
    buyer_phone,
    delivery_location,
    item_name,
    unit_price,
    new Date().toISOString(),
    req.params.id,
    req.user.shop_id
  );

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  broadcast('order:updated', updated);
  res.json(updated);
});

// DELETE /api/orders/:id — remove a mistaken order
router.delete('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND shop_id = ?')
    .get(req.params.id, req.user.shop_id);
    
  if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });

  db.prepare('DELETE FROM orders WHERE id = ? AND shop_id = ?').run(req.params.id, req.user.shop_id);
  broadcast('order:deleted', { id: req.params.id, shop_id: req.user.shop_id });
  res.json({ message: 'Order deleted' });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../lib/database');
const { startPolling, stopPolling } = require('../lib/sheetPoller');

// POST /api/sessions — start a new session
router.post('/', (req, res) => {
  const db = getDb();
  const shopId = req.user.shop_id;
  const { title } = req.body;

  // Check for existing active session
  const active = db.prepare('SELECT * FROM sessions WHERE seller_id = ? AND status = ?').get(shopId, 'active');
  if (active) return res.status(400).json({ error: 'You already have an active session. End it first.' });

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO sessions (id, seller_id, title, status) VALUES (?, ?, ?, 'active')
  `).run(id, shopId, title || null);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

  // Start Google Sheet polling if URL is configured
  const seller = db.prepare('SELECT sheet_url FROM profiles WHERE id = ?').get(shopId);
  if (seller?.sheet_url) {
    startPolling(seller.sheet_url, shopId, id);
  }

  res.status(201).json(session);
});

// PATCH /api/sessions/:id/end — end a session
router.patch('/:id/end', (req, res) => {
  const db = getDb();

  db.prepare(`
    UPDATE sessions SET status = 'ended', ended_at = datetime(?) WHERE id = ? AND seller_id = ?
  `).run(new Date().toISOString(), req.params.id, req.user.shop_id);

  stopPolling();

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  res.json(session);
});

// GET /api/sessions — list sessions
router.get('/', (req, res) => {
  const db = getDb();
  const shopId = req.user.shop_id;
  const sessions = db.prepare('SELECT * FROM sessions WHERE seller_id = ? ORDER BY created_at DESC').all(shopId);
  res.json(sessions);
});

// GET /api/sessions/:id/summary — session analytics
router.get('/:id/summary', (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND seller_id = ?')
    .get(req.params.id, req.user.shop_id);
    
  if (!session) return res.status(404).json({ error: 'Session not found or unauthorized' });

  const orders = db.prepare('SELECT * FROM orders WHERE session_id = ?').all(req.params.id);

  const total_orders = orders.length;
  const verified = orders.filter(o => o.status === 'VERIFIED').length;
  const fulfilled = orders.filter(o => o.status === 'FULFILLED').length;
  const fraud = orders.filter(o => o.status === 'FRAUD').length;
  const pending = orders.filter(o => o.status === 'PENDING').length;
  const cod_pending = orders.filter(o => o.status === 'COD_PENDING').length;
  const review = orders.filter(o => o.status === 'REVIEW').length;
  const average_order_value = total_orders > 0
    ? Math.round(orders.reduce((s, o) => s + (o.expected_amount || 0), 0) / total_orders)
    : 0;
  const fraud_interception_rate = total_orders > 0 ? parseFloat((fraud / total_orders).toFixed(2)) : 0;

  const total_revenue = orders
    .filter(o => ['VERIFIED', 'FULFILLED', 'COD_PENDING'].includes(o.status))
    .reduce((sum, o) => sum + (o.expected_amount || 0), 0);

  // Bestsellers
  const itemMap = {};
  orders.forEach(o => {
    if (!itemMap[o.item_name]) itemMap[o.item_name] = { item_name: o.item_name, quantity_sold: 0, revenue: 0 };
    itemMap[o.item_name].quantity_sold += o.quantity;
    if (['VERIFIED', 'FULFILLED'].includes(o.status)) {
      itemMap[o.item_name].revenue += o.expected_amount || 0;
    }
  });
  const bestsellers = Object.values(itemMap).sort((a, b) => b.quantity_sold - a.quantity_sold);

  res.json({
    session,
    stats: { total_orders, verified, fulfilled, fraud, pending, cod_pending, review, confirmed_revenue: total_revenue, average_order_value, fraud_interception_rate },
    bestsellers,
    orders
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../lib/database');
const { startPolling, stopPolling } = require('../lib/sheetPoller');
const { body, validationResult } = require('express-validator');

// POST /api/sessions — start a new session
router.post('/', [
  body('title').optional().trim().isLength({ max: 100 }).escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const shopId = req.user.shop_id;
  const { title } = req.body;

  // Idempotent Start: Close any existing active sessions first to prevent "Ghost Locks"
  db.prepare(`
    UPDATE sessions SET status = 'ended', ended_at = datetime('now') 
    WHERE shop_id = ? AND status = 'active'
  `).run(shopId);

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO sessions (id, shop_id, title, status) VALUES (?, ?, ?, 'active')
  `).run(id, shopId, title || null);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

  // Start Google Sheet polling if URL is configured
  const shop = db.prepare('SELECT sheet_url FROM shops WHERE id = ?').get(shopId);
  if (shop?.sheet_url) {
    startPolling(shop.sheet_url, shopId, id);
  }

  res.status(201).json(session);
});

// PATCH /api/sessions/:id/end — end a session
router.patch('/:id/end', (req, res) => {
  const db = getDb();

  db.prepare(`
    UPDATE sessions SET status = 'ended', ended_at = datetime(?) WHERE id = ? AND shop_id = ?
  `).run(new Date().toISOString(), req.params.id, req.user.shop_id);

  stopPolling();

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  res.json(session);
});

// GET /api/sessions — list sessions (Live History)
router.get('/', (req, res) => {
  const db = getDb();
  const shopId = req.user.shop_id;
  
  // Aggregate stats per session via JOIN
  const sessions = db.prepare(`
    SELECT 
      s.*, 
      COUNT(o.id) as order_count, 
      SUM(CASE WHEN o.status IN ('VERIFIED', 'FULFILLED', 'COD_PENDING') THEN o.expected_amount ELSE 0 END) as confirmed_revenue
    FROM sessions s
    LEFT JOIN orders o ON s.id = o.session_id
    WHERE s.shop_id = ?
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all(shopId);

  res.json(sessions);
});

// GET /api/sessions/:id/summary — session analytics
router.get('/:id/summary', (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND shop_id = ?')
    .get(req.params.id, req.user.shop_id);
    
  if (!session) return res.status(404).json({ error: 'Session not found or unauthorized' });

  const orders = db.prepare('SELECT * FROM orders WHERE session_id = ? AND shop_id = ?').all(req.params.id, req.user.shop_id);

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

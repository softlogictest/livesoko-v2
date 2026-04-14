const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/database');
const { broadcast } = require('./events');

// GET /api/payments/unmatched - Fetch all pending unmatched payments for a shop
router.get('/unmatched', (req, res) => {
  try {
    const db = getDb();
    const shopId = req.headers['x-shop-id'];
    
    const payments = db.prepare(`
      SELECT * FROM unmatched_payments 
      WHERE shop_id = ? AND status = 'PENDING'
      ORDER BY created_at DESC
    `).all(shopId);

    res.json(payments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payments/link - Link a payment to an order
router.post('/link', (req, res) => {
  try {
    const db = getDb();
    const { payment_id, order_id } = req.body;
    const shopId = req.headers['x-shop-id'];

    const payment = db.prepare('SELECT * FROM unmatched_payments WHERE id = ? AND shop_id = ?').get(payment_id, shopId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND shop_id = ?').get(order_id, shopId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    db.exec('BEGIN TRANSACTION');
    
    // 1. Update order
    const nowStr = new Date().toISOString();
    db.prepare(`
      UPDATE orders SET 
        status = 'VERIFIED',
        status_reason = 'Manually linked from unmatched payment',
        mpesa_sender_name = ?,
        mpesa_amount = ?,
        mpesa_tx_code = ?,
        mpesa_raw_sms = ?,
        mpesa_received_at = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(payment.mpesa_sender, payment.mpesa_amount, payment.mpesa_code, payment.raw_sms, payment.created_at, order_id);

    // 2. Mark payment as linked
    db.prepare(`
      UPDATE unmatched_payments SET 
        status = 'LINKED', 
        linked_order_id = ?,
        updated_at = datetime('now') 
      WHERE id = ?
    `).run(order_id, payment_id);

    db.exec('COMMIT');

    // 3. Broadcast updates
    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    broadcast('order:updated', updatedOrder);
    broadcast('payment:linked', { id: payment_id });

    res.json({ success: true, order: updatedOrder });
  } catch (e) {
    if (db.inTransaction) db.exec('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

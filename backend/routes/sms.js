const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../lib/database');
const { broadcast } = require('./events');
const { parseSms } = require('../utils/smsParser');

// Safe sms_logs insert — never crashes the route if audit log fails
function logSms(db, id, shopId, rawBody, senderNumber, matchStatus, matchedOrderId = null) {
  try {
    db.prepare(`
      INSERT INTO sms_logs (id, shop_id, raw_body, sender_number, matched_order_id, match_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, shopId, rawBody || '', senderNumber || null, matchedOrderId, matchStatus);
  } catch (e) {
    console.warn('[SMS LOG WARN] Could not write to sms_logs:', e.message);
  }
}

function upsertDevice(db, shopId, senderNumber) {
  try {
    const existing = db.prepare('SELECT id FROM devices WHERE shop_id = ? AND sender_number = ?').get(shopId, senderNumber);
    const now = new Date().toISOString();
    
    if (existing) {
      db.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').run(now, existing.id);
    } else {
      db.prepare('INSERT INTO devices (shop_id, sender_number, last_seen_at) VALUES (?, ?, ?)')
        .run(shopId, senderNumber, now);
    }
    
    // Notify frontend that a device is active
    const device = db.prepare('SELECT * FROM devices WHERE shop_id = ? AND sender_number = ?').get(shopId, senderNumber);
    broadcast('device:active', device);
  } catch (e) {
    console.warn('[DEVICE UPSERT WARN]', e.message);
  }
}

// POST /api/sms/:webhook_token — receive M-Pesa SMS
router.post('/:webhook_token', (req, res) => {
  try {
    const db = getDb();
    const { webhook_token } = req.params;
    const { message, sender_number } = req.body;

    // Step 1: Find seller by webhook token
    const seller = db.prepare('SELECT * FROM shops WHERE webhook_token = ?').get(webhook_token);
    if (!seller) return res.status(404).json({ error: 'Invalid webhook token' });

    const shopId = seller.id;
    const logId = crypto.randomUUID();

    // Register/update device
    if (sender_number) upsertDevice(db, shopId, sender_number);

    // Step 2: Parse the SMS
    const parseResult = parseSms(message);

    if (!parseResult || !parseResult.success) {
      logSms(db, logId, shopId, message, sender_number, 'PARSE_ERROR');
      return res.status(200).json({ match_status: 'PARSE_ERROR', message: 'Could not parse SMS' });
    }

    const parsed = parseResult.data;

    // Step 3: Check for duplicate TX code
    const existing = db.prepare('SELECT id FROM orders WHERE mpesa_tx_code = ?').get(parsed.txCode);
    if (existing) {
      logSms(db, logId, shopId, message, sender_number, 'DUPLICATE', existing.id);
      return res.status(200).json({ match_status: 'DUPLICATE', message: 'Transaction code already used' });
    }

    // Step 4: Find active session
    const session = db.prepare('SELECT * FROM sessions WHERE shop_id = ? AND status = ?').get(shopId, 'active');
    if (!session) {
      logSms(db, logId, shopId, message, sender_number, 'UNMATCHED');
      return res.status(200).json({ match_status: 'UNMATCHED', message: 'No active session' });
    }

    // Step 5: Match by amount — find PENDING orders within ±Ksh 50 (lenient match for live discounts)
    const amount = parsed.amount;
    const matchingOrders = db.prepare(`
      SELECT * FROM orders 
      WHERE session_id = ? AND shop_id = ? AND status = 'PENDING'
        AND expected_amount BETWEEN ? AND ?
      ORDER BY ABS(expected_amount - ?) ASC, created_at DESC
    `).all(session.id, shopId, amount - 50, amount + 50, amount);

    if (matchingOrders.length === 0) {
      db.prepare(`
        INSERT INTO unmatched_payments (shop_id, mpesa_code, mpesa_amount, mpesa_sender, raw_sms)
        VALUES (?, ?, ?, ?, ?)
      `).run(shopId, parsed.txCode, parsed.amount, parsed.senderName, message);

      const unmatched = db.prepare('SELECT * FROM unmatched_payments WHERE mpesa_code = ?').get(parsed.txCode);
      broadcast('payment:unmatched', unmatched);
      
      logSms(db, logId, shopId, message, sender_number, 'UNMATCHED');
      return res.status(200).json({ match_status: 'UNMATCHED', message: `No pending order for Ksh ${amount}` });
    }

    // Step 6: Take closest/most-recent match
    const bestMatch = matchingOrders[0];
    const amountDiff = Math.round(Math.abs(parsed.amount - bestMatch.expected_amount));

    // Step 7: Fuzzy name check (advisory — never blocks verification)
    const expectedName = (bestMatch.buyer_mpesa_name || bestMatch.buyer_name || '').toLowerCase();
    const senderName = (parsed.senderName || '').toLowerCase();
    let nameNote = null;
    if (expectedName && senderName) {
      const expectedTokens = expectedName.split(/\s+/).filter(t => t.length > 1);
      const senderTokens = senderName.split(/\s+/).filter(t => t.length > 1);
      const overlap = expectedTokens.some(t => senderTokens.includes(t));
      if (!overlap) {
        nameNote = `Name mismatch: expected ${(bestMatch.buyer_mpesa_name || bestMatch.buyer_name).toUpperCase()}, got ${(parsed.senderName || '').toUpperCase()}`;
      }
    }

    const statusReason = [
      amountDiff > 0 ? `Lenient match — amount differed by Ksh ${amountDiff}` : null,
      nameNote
    ].filter(Boolean).join(' | ') || null;

    // Step 7: Update the matched order
    const nowStr = new Date().toISOString();
    db.prepare(`
      UPDATE orders SET 
        status = 'VERIFIED', status_reason = ?,
        mpesa_sender_name = ?, mpesa_amount = ?, mpesa_tx_code = ?,
        mpesa_raw_sms = ?, mpesa_received_at = datetime(?), updated_at = datetime(?)
      WHERE id = ?
    `).run(
      statusReason,
      parsed.senderName, parsed.amount, parsed.txCode,
      message, nowStr, nowStr,
      bestMatch.id
    );

    // Step 8: If multiple matches, flag others as REVIEW
    if (matchingOrders.length > 1) {
      for (let i = 1; i < matchingOrders.length; i++) {
        db.prepare(`
          UPDATE orders SET status = 'REVIEW', status_reason = 'Multiple orders with same amount', updated_at = datetime(?) WHERE id = ?
        `).run(nowStr, matchingOrders[i].id);
        const reviewOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(matchingOrders[i].id);
        broadcast('order:updated', reviewOrder);
      }
    }

    // Step 9: Broadcast verified order (before logging — broadcast must not fail)
    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(bestMatch.id);
    broadcast('order:updated', updatedOrder);

    // Step 10: Log (non-fatal)
    logSms(db, logId, shopId, message, sender_number, 'MATCHED', bestMatch.id);

    return res.status(200).json({
      match_status: 'MATCHED',
      order_id: bestMatch.id,
      status: 'VERIFIED',
      buyer_name: bestMatch.buyer_name,
      amount: parsed.amount
    });

  } catch (e) {
    console.error('[SMS ROUTE ERROR]', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;

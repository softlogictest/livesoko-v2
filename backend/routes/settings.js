const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/database');

// GET /api/settings — get seller's settings
router.get('/', (req, res) => {
  const db = getDb();
  const seller = db.prepare('SELECT id, email, role, shop_name, tiktok_handle, mpesa_number, webhook_token, sheet_url, created_at FROM profiles WHERE id = ?')
    .get(req.user.id);

  // Get handymen
  const handymen = db.prepare('SELECT id, email, role, created_at FROM profiles WHERE seller_id = ?')
    .all(req.user.id);

  res.json({ seller, handymen });
});

// PATCH /api/settings — update seller settings
router.patch('/', (req, res) => {
  const db = getDb();
  const { shop_name, tiktok_handle, mpesa_number, sheet_url } = req.body;

  const updates = [];
  const params = [];

  if (shop_name !== undefined) { updates.push('shop_name = ?'); params.push(shop_name); }
  if (tiktok_handle !== undefined) { updates.push('tiktok_handle = ?'); params.push(tiktok_handle); }
  if (mpesa_number !== undefined) { updates.push('mpesa_number = ?'); params.push(mpesa_number); }
  if (sheet_url !== undefined) { updates.push('sheet_url = ?'); params.push(sheet_url); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  updates.push('updated_at = datetime(?)');
  params.push(new Date().toISOString());
  params.push(req.user.id);

  db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT id, email, role, shop_name, tiktok_handle, mpesa_number, webhook_token, sheet_url FROM profiles WHERE id = ?')
    .get(req.user.id);

  res.json(updated);
});

module.exports = router;

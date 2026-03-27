const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/database');

// GET /api/settings — get seller's settings
router.get('/', (req, res) => {
  const db = getDb();
  const seller = db.prepare('SELECT id, email, role, shop_name, tiktok_handle, mpesa_number, webhook_token, sheet_url, created_at FROM profiles WHERE id = ?')
    .get(req.user.shop_id);

  // Get handymen
  const handymen = db.prepare('SELECT id, email, role, created_at FROM profiles WHERE seller_id = ?')
    .all(req.user.shop_id);

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
  params.push(req.user.shop_id);

  db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json(updated);
});

// POST /api/settings/handymen — create a new handyman account
router.post('/handymen', async (req, res) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Only sellers can create staff accounts' });
  }

  const db = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcryptjs');
    
    // Check if email already exists
    const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 12); // Pillar 1: Strong Hashing (cost 12)
    const webhook_token = 'tok_' + require('crypto').randomBytes(6).toString('hex');

    db.prepare(`
      INSERT INTO profiles (id, email, password_hash, role, seller_id, shop_name, webhook_token)
      VALUES (?, ?, ?, 'handyman', ?, ?, ?)
    `).run(id, email, hash, req.user.shop_id, req.user.shop_name, webhook_token);

    const created = db.prepare('SELECT id, email, role, created_at FROM profiles WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating handyman:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

module.exports = router;

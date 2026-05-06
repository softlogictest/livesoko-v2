const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../lib/database');
const { body, validationResult } = require('express-validator');
const { broadcast } = require('./events');

// GET /api/enquiries — Seller inbox
router.get('/', (req, res) => {
  const shopId = req.headers['x-shop-id'];
  if (!shopId) return res.status(400).json({ error: 'Shop ID required' });

  const db = getDb();
  const enquiries = db.prepare(`
    SELECT * FROM enquiries 
    WHERE shop_id = ? 
    ORDER BY created_at DESC
  `).all(shopId);

  res.json(enquiries);
});

// PATCH /api/enquiries/:id — Update status
router.patch('/:id', [
  body('status').isIn(['PENDING', 'REPLIED', 'CONVERTED'])
], (req, res) => {
  const shopId = req.headers['x-shop-id'];
  const { id } = req.params;
  const { status } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  
  try {
    const result = db.prepare(`
      UPDATE enquiries 
      SET status = ? 
      WHERE id = ? AND shop_id = ?
    `).run(status, id, shopId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Enquiry not found or unauthorized' });
    }

    const updated = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id);
    broadcast('enquiry:updated', updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

module.exports = router;

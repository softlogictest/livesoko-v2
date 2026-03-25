const express = require('express');
const router = express.Router();
const { pool } = require('../lib/db');

// GET /api/profile — fetch the authenticated user's profile via direct SQL
router.get('/', async (req, res) => {
  try {
    // The auth middleware attaches req.user with the user's id
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const result = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;

// Server-Sent Events (SSE) manager
// Replaces Supabase Realtime WebSocket

const { getDb } = require('../lib/database');
const express = require('express');
const router = express.Router();

const clients = new Map(); // Map<shopId, Set<res>>

function addClient(shopId, res) {
  if (!shopId) return;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write('event: connected\ndata: {"status":"ok"}\n\n');

  if (!clients.has(shopId)) clients.set(shopId, new Set());
  clients.get(shopId).add(res);

  res.on('close', () => {
    const shopClients = clients.get(shopId);
    if (shopClients) {
      shopClients.delete(res);
      if (shopClients.size === 0) clients.delete(shopId);
    }
  });
}

function broadcast(event, data) {
  const shopId = data.shop_id || data.seller_id; // Added fallback to support any old data objects momentarily
  if (!shopId) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const shopClients = clients.get(shopId);
  
  if (shopClients) {
    for (const client of shopClients) {
      client.write(payload);
    }
  }
}

// GET /api/events?token=XYZ&shop_id=ABC
router.get('/', (req, res) => {
  const { token, shop_id } = req.query;
  if (!token || !shop_id) return res.status(401).end();

  const db = getDb();
  
  // Verify token maps to user, and user is mapped to that shop
  const hasAccess = db.prepare(`
    SELECT t.user_id FROM auth_tokens t
    JOIN shop_users su ON t.user_id = su.user_id
    WHERE t.token = ? AND su.shop_id = ?
  `).get(token, shop_id);

  if (!hasAccess) return res.status(401).end();

  addClient(shop_id, res);
});

module.exports = { router, broadcast };

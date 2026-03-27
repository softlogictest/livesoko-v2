// Server-Sent Events (SSE) manager
// Replaces Supabase Realtime WebSocket

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
  const shopId = data.seller_id;
  if (!shopId) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const shopClients = clients.get(shopId);
  
  if (shopClients) {
    for (const client of shopClients) {
      client.write(payload);
    }
  }
}

// Express route handler
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(401).end();

  const db = getDb();
  const row = db.prepare(`
    SELECT p.id, p.role, p.seller_id FROM auth_tokens t
    JOIN profiles p ON t.user_id = p.id
    WHERE t.token = ?
  `).get(token);

  if (!row) return res.status(401).end();

  const shopId = row.role === 'seller' ? row.id : row.seller_id;
  addClient(shopId, res);
});

module.exports = { router, broadcast };

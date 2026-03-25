// Server-Sent Events (SSE) manager
// Replaces Supabase Realtime WebSocket

const clients = new Set();

function addClient(res) {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send a ping immediately so the client knows it's connected
  res.write('event: connected\ndata: {"status":"ok"}\n\n');

  clients.add(res);

  // Remove client on disconnect
  res.on('close', () => {
    clients.delete(res);
  });
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

// Express route handler
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  addClient(res);
});

module.exports = { router, broadcast };

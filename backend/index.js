const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { init: initDb } = require('./lib/database');

// Initialize database FIRST (creates tables + default account)
const db = initDb();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware (import after db init)
const { authenticate } = require('./middleware/auth');

// Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sms', require('./routes/sms')); // SMS webhook uses webhook_token, not auth
app.use('/api/events', require('./routes/events').router); // SSE is open (browser handles auth)

// Protected routes
app.use('/api/orders', authenticate, require('./routes/orders'));
app.use('/api/sessions', authenticate, require('./routes/sessions'));
app.use('/api/settings', authenticate, require('./routes/settings'));

// Also allow unauthenticated order creation via webhook_token
const ordersRouter = require('./routes/orders');
app.post('/api/orders/webhook', (req, res, next) => {
  // Forward to orders route handler which checks for webhook_token
  req.user = null; // Explicitly no user
  ordersRouter.handle(req, res, next);
});




// Ensure handyman test account exists
const bcrypt = require('bcryptjs');
const handymanPass = bcrypt.hashSync('12345678', 10);
db.prepare(`
  INSERT OR IGNORE INTO profiles (id, email, password_hash, role, shop_name)
  VALUES (?, ?, ?, ?, ?)
`).run(
  'handyman-id-001',
  'handyman@dukalive.local',
  handymanPass,
  'handyman',
  'DukaLive Sample Shop'
);

// Serve React frontend
// Railway build puts it in backend/public; local dev has it in frontend/dist
const frontendPublic = path.join(__dirname, 'public');
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const frontendPath = fs.existsSync(path.join(frontendPublic, 'index.html'))
  ? frontendPublic
  : frontendDist;
console.log('Serving frontend from:', frontendPath);

app.use(express.static(frontendPath));
app.get('*', (req, res, next) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      // Frontend not built yet — show helpful message
      res.json({
        status: 'ok',
        name: 'DukaLive API v2.1.0',
        message: 'Backend is running. Build the frontend with: cd frontend && npm run build'
      });
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'DukaLive v2.1.0', mode: 'local' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Get local IP for display
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Start server — try PORT, then fallback
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║              DukaLive v2.1.0 — LOCAL             ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  On this PC:    http://localhost:${PORT}             ║`);
  console.log(`║  On WiFi/LAN:   http://${ip}:${PORT}       ║`);
  console.log('║                                                  ║');
  console.log('║  Open the WiFi URL on your phone to use the app  ║');
  console.log('║  SMS Forwarder → same WiFi URL + /api/sms/TOKEN  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const altPort = PORT + 1;
    console.log(`Port ${PORT} in use, trying ${altPort}...`);
    app.listen(altPort, '0.0.0.0', () => {
      const ip = getLocalIP();
      console.log(`DukaLive v2.1.0 running at http://${ip}:${altPort}`);
    });
  } else {
    throw err;
  }
});

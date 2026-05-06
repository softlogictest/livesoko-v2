const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { init: initDb } = require('./lib/database');
const adminRouter = require('./routes/admin');
const ordersRouter = require('./routes/orders');
const paymentsRouter = require('./routes/payments');
const sessionsRouter = require('./routes/sessions');

// Log Capture for Super Interface
class LogBuffer {
  constructor(limit = 200) {
    this.logs = [];
    this.limit = limit;
  }
  add(type, message) {
    const log = {
      timestamp: new Date().toISOString(),
      type,
      message: typeof message === 'string' ? message : JSON.stringify(message)
    };
    this.logs.push(log);
    if (this.logs.length > this.limit) this.logs.shift();
  }
  getLogs() { return this.logs; }
}
const logBuffer = new LogBuffer();
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => {
  logBuffer.add('info', args.join(' '));
  originalLog.apply(console, args);
};
console.error = (...args) => {
  logBuffer.add('error', args.join(' '));
  originalError.apply(console, args);
};
global.logBuffer = logBuffer; // Expose to routers

// Initialize database FIRST (creates tables + default account)
const db = initDb();

// Initialize Shadow Sync AI Data Extractor
const { initShadowSync } = require('./jobs/shadowSync');
initShadowSync();

const app = express();

// Security Pillar 6: Trust Proxy (Crucial for Railway/Load Balancers)
app.set('trust proxy', 1);

// Security Pillar 5: Helmet for Secure Headers
app.use(helmet({
  contentSecurityPolicy: false, // Turned off for dev simplicity, but can be hardened later
}));

// Security Pillar 6: Combined Audit Logging
app.use(morgan('combined'));

// Middleware
// Rate Limiting (Standard)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Increased to 2000 to prevent local dev/HMR lockouts
  message: { error: 'Too many requests, please try again later.' }
});

// Security Pillar 1 & 5: Granular Rate Limiting for Auth
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' }
});

// Registration rate limiter disabled during development/testing
// const registerLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000,
//   max: 100,
//   message: { error: 'Too many accounts created. Please wait 1 hour.' }
// });

// Security Pillar 5: Webhook & SMS Throttling (Protect DB from floods)
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Order intake busy. Please try again in 15 minutes.' }
});

const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Higher limit for SMS as batches can come in
  message: { error: 'SMS integration throttled.' }
});

app.use('/api/', limiter);
app.use('/api/auth/login', loginLimiter);
// app.use('/api/auth/register', registerLimiter); // Disabled during testing
app.use('/api/orders/webhook', webhookLimiter);
app.use('/api/sms/', smsLimiter);

// CORS Lockdown
const domain = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : '*');

console.log(`[AUTH] CORS allowing origin: ${domain}`);

app.use(cors({
  origin: domain,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-shop-id']
}));

app.use(express.json());

// Auth middleware (import after db init)
const { authenticate, checkBilling } = require('./middleware/auth');

// Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/sms', require('./routes/sms')); // SMS webhook uses webhook_token, not auth
app.use('/api/events', require('./routes/events').router); // SSE is open (browser handles auth)

// Public Webhook for Order Intake (MUST precede general authenticated routes)
app.post('/api/orders/webhook', (req, res, next) => {
  // Forward to orders route handler which checks for webhook_token
  req.user = null; // Explicitly no user
  req.url = '/';   // Rewrite URL so ordersRouter.post('/') catches it
  ordersRouter.handle(req, res, next);
});

// Protected routes
app.use('/api/orders', authenticate, checkBilling, ordersRouter);
app.use('/api/payments', authenticate, checkBilling, paymentsRouter);
app.use('/api/sessions', authenticate, checkBilling, sessionsRouter);
app.use('/api/settings', authenticate, require('./routes/settings')); // Settings does not use checkBilling so users can manage billing
app.use('/api/admin', authenticate, adminRouter);

// Serve React frontend
// Railway build puts it in backend/public; local dev has it in frontend/dist
const frontendPublic = path.join(__dirname, 'public');
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const frontendPath = fs.existsSync(path.join(frontendPublic, 'index.html'))
  ? frontendPublic
  : frontendDist;
console.log('Serving frontend from:', frontendPath);

app.use(express.static(frontendPath));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'LiveSoko v2.4.0', mode: 'local' });
});

app.get('*', (req, res, next) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      // Frontend not built yet — show helpful message
      res.json({
        status: 'ok',
        name: 'LiveSoko API v2.4.0',
        message: 'Backend is running. Build the frontend with: cd frontend && npm run build'
      });
    }
  });
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
  console.log('║              LiveSoko v2.4.0 — LOCAL             ║');
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
      console.log(`LiveSoko v2.4.0 running at http://${ip}:${altPort}`);
    });
  } else {
    throw err;
  }
});

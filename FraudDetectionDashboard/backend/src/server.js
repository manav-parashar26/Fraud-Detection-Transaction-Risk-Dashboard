require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const { connectDB, isDatabaseConnected, disconnectDB } = require('./config/database');
const { isEngineAvailable } = require('./config/engine');
const transactionsRouter = require('./routes/transactions');
const alertsRouter = require('./routes/alerts');
const analyticsRouter = require('./routes/analytics');
const networksRouter = require('./routes/networks');
const monitoringRouter = require('./routes/monitoring');
const analyticsController = require('./controllers/analyticsController');
const streamManager = require('./services/streamManager');

const app = express();
const PORT = process.env.PORT || 5000;

// Production CORS Configuration
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, health probes)
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true
};

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);

// General Rate Limiter (500 requests per 15 mins)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', generalLimiter);

// Specific Rate Limiter for compute-intensive endpoints (45 reqs per minute)
const engineTriggerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 45,
  message: { error: 'Rate limit exceeded for engine execution, please wait before retrying.' }
});

// Wrap express app with standard HTTP server for Socket.IO integration
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' && !allowedOrigins.includes('*') ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Pass Socket.IO instance to streamManager
streamManager.init(io);

// Enable Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// Parse incoming JSON requests
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Production Health check endpoint (Step 6)
app.get('/api/health', (req, res) => {
  const dbConnected = isDatabaseConnected();
  const monitoringRunning = streamManager.getStatus().running;
  const engineAvailable = isEngineAvailable();

  res.status(200).json({
    status: 'ok',
    backend: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    monitoring: monitoringRunning ? 'active' : 'stopped',
    engine: engineAvailable ? 'available' : 'unavailable',
    // Backward-compatible booleans
    databaseConnected: dbConnected,
    monitoringActive: monitoringRunning,
    engineAvailable: engineAvailable,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Manual trigger to run C++ fraud detection engine and synchronize database
app.post('/api/analyze', engineTriggerLimiter, analyticsController.runAnalysis);

// Core API routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/networks', networksRouter);
app.use('/api/monitoring', monitoringRouter);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Fraud Detection & Transaction Risk Engine API',
    version: '2.1.0',
    description: 'Production Node.js Express + Socket.IO + MongoDB backend orchestrating C++17 DSA Fraud Engine',
    database: isDatabaseConnected() ? 'Connected' : 'Fallback (In-Memory Cache)',
    engine: isEngineAvailable() ? 'Available' : 'Unavailable',
    endpoints: {
      health: 'GET /api/health',
      triggerAnalysis: 'POST /api/analyze',
      transactions: 'GET /api/transactions?page=1&limit=50',
      transactionById: 'GET /api/transactions/:id',
      alerts: 'GET /api/alerts?riskLevel=CRITICAL',
      analytics: 'GET /api/analytics',
      suspiciousAccounts: 'GET /api/analytics/suspicious-accounts?limit=10',
      networks: 'GET /api/networks',
      monitoringStatus: 'GET /api/monitoring/status',
      startMonitoring: 'POST /api/monitoring/start',
      stopMonitoring: 'POST /api/monitoring/stop'
    },
    websocketEvents: [
      'monitoring:status',
      'transaction:update',
      'fraud:alert',
      'analytics:update',
      'network:update'
    ]
  });
});

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('[Backend Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Clean shutdown handler (Step 7)
async function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  streamManager.stopMonitoring();
  if (io) {
    try {
      io.close();
    } catch (e) {
      console.error('[Server] Error closing Socket.IO:', e.message);
    }
  }
  await disconnectDB();

  server.close(() => {
    console.log('[Server] HTTP server closed cleanly.');
    process.exit(0);
  });

  // Force exit if hanging after 5s
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Initialize database and start HTTP server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`Fraud Detection Backend API running on port ${PORT}`);
      console.log(`Health Check: http://localhost:${PORT}/api/health`);
      console.log(`Database Connected: ${isDatabaseConnected()}`);
      console.log(`C++ Engine Available: ${isEngineAvailable()}`);
      console.log(`WebSocket Server: Active on port ${PORT}`);
      console.log(`====================================================`);
    });
  });
}

module.exports = { app, server };

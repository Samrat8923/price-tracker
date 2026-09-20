const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const browserManager = require('./src/scraper/browser');

const healthRoutes = require('./src/routes/health');
const productRoutes = require('./src/routes/products');
const trackedRoutes = require('./src/routes/tracked');
const cronRoutes = require('./src/routes/cron');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow Vercel frontend and local development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret']
}));
app.use(express.json());

// Request logger (in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// API Routes
app.use('/api', healthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/tracked-products', trackedRoutes);
app.use('/api/cron', cronRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Only start listening if run directly as script
let server = null;
if (require.main === module) {
  server = app.listen(config.port, () => {
    console.log('====================================================');
    console.log(`  INE Product Price Tracker Server Running`);
    console.log(`  Port        : ${config.port}`);
    console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Base URL    : http://localhost:${config.port}`);
    console.log('====================================================');
  });

  async function handleShutdown(signal) {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    if (server) {
      server.close(async () => {
        console.log('HTTP server closed.');
        await browserManager.shutdown();
        console.log('Browser resources released. Exiting.');
        process.exit(0);
      });
    }
  }

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

module.exports = app;

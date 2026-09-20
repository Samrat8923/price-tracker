const express = require('express');
const router = express.Router();
const config = require('../config');
const trackerService = require('../services/trackerService');

/**
 * Middleware to verify CRON_SECRET
 * Accepts secret in Authorization header (Bearer), x-cron-secret header, or secret query param.
 */
function verifyCronSecret(req, res, next) {
  const configuredSecret = config.cronSecret;

  if (!configuredSecret) {
    return res.status(500).json({ error: 'CRON_SECRET is not configured on server' });
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const customHeader = req.headers['x-cron-secret'];
  const querySecret = req.query.secret;

  const providedSecret = bearerToken || customHeader || querySecret;

  if (!providedSecret || providedSecret !== configuredSecret) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing CRON_SECRET'
    });
  }

  next();
}

/**
 * POST /api/cron/scrape
 * Scheduled cron endpoint to scrape all active tracked products.
 * Requires CRON_SECRET.
 */
router.post('/scrape', verifyCronSecret, async (req, res) => {
  try {
    console.log('[Cron API] Triggered scheduled batch scrape');
    const summary = await trackerService.runScheduledCron();

    res.json({
      message: 'Scheduled batch scrape completed',
      timestamp: new Date().toISOString(),
      summary
    });
  } catch (err) {
    console.error('[Cron API] Scheduled scrape failed:', err);
    res.status(500).json({
      error: 'Scheduled batch scrape failed',
      message: err.message
    });
  }
});

module.exports = router;

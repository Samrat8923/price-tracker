const express = require('express');
const router = express.Router();
const repository = require('../db/repository');

router.get('/health', async (req, res) => {
  try {
    const dbHealth = await repository.checkHealth();
    res.json({
      status: 'ok',
      service: 'ine-price-tracker-api',
      timestamp: new Date().toISOString(),
      database: dbHealth
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

module.exports = router;

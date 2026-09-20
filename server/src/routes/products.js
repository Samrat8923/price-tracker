const express = require('express');
const router = express.Router();
const catalogService = require('../services/catalogService');

/**
 * GET /api/products/search?q=
 * Searches INE mock storefront products by partial or full product name.
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit, 10) || 30;

    const results = await catalogService.search(query, limit);

    res.json({
      query,
      count: results.length,
      products: results
    });
  } catch (err) {
    console.error('Search route error:', err);
    res.status(500).json({
      error: 'Failed to search storefront products',
      message: err.message
    });
  }
});

module.exports = router;

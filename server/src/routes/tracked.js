const express = require('express');
const router = express.Router();
const repository = require('../db/repository');
const trackerService = require('../services/trackerService');

/**
 * POST /api/tracked-products
 * Select a product to track and initiate initial scrape.
 */
router.post('/', async (req, res) => {
  try {
    const { product_name, product_url, product_image } = req.body;

    if (!product_url) {
      return res.status(400).json({ error: 'product_url is required' });
    }

    const { product, isNew } = await trackerService.trackProduct({
      product_name,
      product_url,
      product_image
    });

    // If new or requested, run initial scrape immediately
    let initialScrape = null;
    try {
      initialScrape = await trackerService.scrapeProduct(product.id, { trigger_type: 'MANUAL' });
    } catch (scrapeErr) {
      console.warn('Initial scrape warning:', scrapeErr.message);
    }

    const fullProduct = await trackerService.getProductDetails(product.id);

    res.status(isNew ? 201 : 200).json({
      message: isNew ? 'Product tracked successfully' : 'Product was already tracked',
      product: fullProduct,
      initialScrape
    });
  } catch (err) {
    console.error('Track product error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tracked-products
 * List all tracked products with current price and stock.
 */
router.get('/', async (req, res) => {
  try {
    const products = await repository.getTrackedProducts();
    res.json(products);
  } catch (err) {
    console.error('List tracked products error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tracked-products/:id
 * Get single tracked product with details.
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await trackerService.getProductDetails(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Tracked product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('Get tracked product error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tracked-products/:id/history
 * Get price and stock history for a product.
 */
router.get('/:id/history', async (req, res) => {
  try {
    const history = await repository.getPriceHistory(req.params.id);
    res.json(history);
  } catch (err) {
    console.error('Get price history error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tracked-products/:id/logs
 * Get per-product scrape attempt logs.
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const logs = await repository.getScrapeLogs(req.params.id);
    res.json(logs);
  } catch (err) {
    console.error('Get scrape logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tracked-products/:id/scrape
 * Run an on-demand scrape for a specific tracked product.
 */
router.post('/:id/scrape', async (req, res) => {
  try {
    const product = await repository.getTrackedProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Tracked product not found' });
    }

    const scrapeResult = await trackerService.scrapeProduct(product.id, { trigger_type: 'MANUAL' });
    const updatedDetails = await trackerService.getProductDetails(product.id);

    res.json({
      message: scrapeResult.success ? 'Product scraped successfully' : 'Scrape attempt failed',
      scrapeResult,
      product: updatedDetails
    });
  } catch (err) {
    console.error('Run scrape now error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/tracked-products/:id
 * Delete a tracked product and its history/logs.
 */
router.delete('/:id', async (req, res) => {
  try {
    const product = await repository.getTrackedProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Tracked product not found' });
    }

    await repository.deleteTrackedProduct(req.params.id);
    res.json({ message: 'Tracked product removed successfully', id: req.params.id });
  } catch (err) {
    console.error('Delete tracked product error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

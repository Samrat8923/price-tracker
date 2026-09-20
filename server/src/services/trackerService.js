const repository = require('../db/repository');
const { scrapeWithRetries } = require('../scraper/scrapeEngine');

class TrackerService {
  /**
   * Track a product and run its initial scrape.
   */
  async trackProduct({ product_name, product_url, product_image }) {
    if (!product_url) {
      throw new Error('product_url is required');
    }

    // Normalize URL
    const url = product_url.trim();

    // Check if already tracked
    let existing = await repository.findTrackedProductByUrl(url);
    if (existing) {
      // If inactive, reactivate it
      if (!existing.is_active) {
        existing = await repository.updateTrackedProduct(existing.id, { is_active: true });
      }
      return { product: existing, isNew: false };
    }

    // Create tracked product
    const product = await repository.createTrackedProduct({
      product_name: product_name || 'INE Product',
      product_url: url,
      product_image: product_image || null
    });

    return { product, isNew: true };
  }

  /**
   * Scrape a single tracked product by its ID.
   * Logs every attempt to scrape_logs.
   * Only writes to price_history if scrape succeeds and passes validation.
   */
  async scrapeProduct(id, options = {}) {
    const product = await repository.getTrackedProductById(id);
    if (!product) {
      throw new Error(`Tracked product with ID ${id} not found`);
    }

    const trigger_type = options.trigger_type === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL';
    console.log(`[Scraper] Starting scrape for product "${product.product_name}" (${product.product_url}) [Trigger: ${trigger_type}]...`);

    const result = await scrapeWithRetries(product.product_url, {
      ...options,
      onAttempt: async (attempt) => {
        // Persist each attempt log directly into scrape_logs table
        try {
          await repository.addScrapeLog({
            tracked_product_id: product.id,
            attempt_number: attempt.attempt_number,
            trigger_type: trigger_type,
            status: attempt.status,
            started_at: attempt.started_at,
            completed_at: attempt.completed_at,
            duration_ms: attempt.duration_ms,
            error_message: attempt.error_message,
            http_status: attempt.http_status
          });
        } catch (dbErr) {
          console.error('[Scraper] Failed to save scrape attempt log:', dbErr.message);
        }
      }
    });

    // Update product title or image if missing or updated
    if (result.success && result.productName && product.product_name === 'INE Product') {
      await repository.updateTrackedProduct(product.id, {
        product_name: result.productName,
        product_image: result.productImage || product.product_image
      });
    }

    // IMPORTANT: Only insert price_history on valid extraction
    if (result.success && result.price && result.stock) {
      await repository.addPriceHistory({
        tracked_product_id: product.id,
        price: result.price,
        stock_status: result.stock,
        scraped_at: new Date().toISOString()
      });
      console.log(`[Scraper] Success! Price: ₹${result.price}, Stock: ${result.stock}`);
    } else {
      console.warn(`[Scraper] Scrape failed for "${product.product_name}": ${result.finalError}. Valid history preserved.`);
    }

    return {
      success: result.success,
      price: result.price || null,
      stock: result.stock || null,
      productName: result.productName || product.product_name,
      attempts: result.attempts,
      trigger_type: trigger_type,
      error: result.finalError || null
    };
  }

  /**
   * Get full details of a product including history and logs.
   */
  async getProductDetails(id) {
    const product = await repository.getTrackedProductById(id);
    if (!product) return null;

    const [history, logs] = await Promise.all([
      repository.getPriceHistory(id),
      repository.getScrapeLogs(id)
    ]);

    const latestPrice = history.length > 0 ? history[history.length - 1] : null;
    const previousPrice = history.length >= 2 ? history[history.length - 2] : null;
    const latestLog = logs.length > 0 ? logs[0] : null;

    // Calculate latest automatic run from actual AUTOMATIC records only
    const automaticLogs = logs.filter(l => l.trigger_type === 'AUTOMATIC' && l.status === 'SUCCESS');
    const latestAuto = automaticLogs[0] || null;
    const last_automatic_scrape_at = latestAuto ? (latestAuto.completed_at || latestAuto.started_at) : null;
    const next_automatic_scrape_at = last_automatic_scrape_at
      ? new Date(new Date(last_automatic_scrape_at).getTime() + 2 * 60 * 60 * 1000).toISOString()
      : null;

    const catalogService = require('./catalogService');
    const sku = catalogService.getSkuByUrl(product.product_url);

    return {
      ...product,
      sku: sku,
      current_price: latestPrice ? Number(latestPrice.price) : null,
      previous_price: previousPrice ? Number(previousPrice.price) : null,
      current_stock: latestPrice ? latestPrice.stock_status : null,
      last_scraped_at: latestPrice ? latestPrice.scraped_at : (latestLog ? (latestLog.completed_at || latestLog.started_at) : null),
      last_scrape_status: latestLog ? latestLog.status : null,
      latest_attempt_number: latestLog ? (latestLog.attempt_number || 1) : 1,
      latest_error: latestLog ? latestLog.error_message : null,
      latest_trigger_type: latestLog ? (latestLog.trigger_type || 'MANUAL') : null,
      last_automatic_scrape_at,
      next_automatic_scrape_at,
      history,
      logs
    };
  }

  /**
   * Run scheduled scrape for all active products (used by external cron-job.org).
   */
  async runScheduledCron() {
    const activeProducts = await repository.getActiveTrackedProducts();
    console.log(`[Cron] Starting scheduled scrape for ${activeProducts.length} active products...`);

    const summary = {
      total: activeProducts.length,
      succeeded: 0,
      failed: 0,
      results: []
    };

    // Scrape sequentially to avoid overwhelming system resources and target server
    for (const product of activeProducts) {
      try {
        const scrapeResult = await this.scrapeProduct(product.id, { trigger_type: 'AUTOMATIC' });
        if (scrapeResult.success) {
          summary.succeeded++;
        } else {
          summary.failed++;
        }
        summary.results.push({
          id: product.id,
          name: product.product_name,
          success: scrapeResult.success,
          price: scrapeResult.price,
          stock: scrapeResult.stock,
          error: scrapeResult.error
        });
      } catch (err) {
        summary.failed++;
        summary.results.push({
          id: product.id,
          name: product.product_name,
          success: false,
          error: err.message
        });
      }
    }

    console.log(`[Cron] Completed scheduled scrape. Success: ${summary.succeeded}, Failed: ${summary.failed}`);
    return summary;
  }
}

module.exports = new TrackerService();

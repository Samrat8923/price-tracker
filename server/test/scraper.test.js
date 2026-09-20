const test = require('node:test');
const assert = require('node:assert');
const { scrapeWithRetries } = require('../src/scraper/scrapeEngine');
const browserManager = require('../src/scraper/browser');

test('Scraper: Live Storefront Playwright Extraction', { timeout: 120000 }, async (t) => {
  await t.test('successfully scrapes real product 961 from INE storefront', async () => {
    const url = 'https://demo.inelabteamdev.com/product/961';
    console.log('Testing live scrape against:', url);

    const result = await scrapeWithRetries(url, {
      headless: true,
      maxRetries: 3
    });

    console.log('Live Scrape Result:', {
      success: result.success,
      price: result.price,
      stock: result.stock,
      productName: result.productName,
      attempts: result.attempts.length
    });

    assert.strictEqual(result.success, true, 'Scrape should succeed');
    assert.strictEqual(typeof result.price, 'number', 'Price must be a number');
    assert.ok(result.price > 0, 'Price must be positive');
    // Ensure real price was extracted and not fake decoy
    assert.notStrictEqual(result.price, 14133, 'Must not extract fake hidden decoy price (14133)');
    assert.notStrictEqual(result.price, 16171, 'Must not extract fake hidden decoy price (16171)');

    assert.strictEqual(typeof result.stock, 'string', 'Stock must be a string');
    assert.ok(result.stock.includes('Stock'), 'Stock should contain Stock status');

    assert.strictEqual(typeof result.productName, 'string');
    assert.ok(result.productName.toLowerCase().includes('vista'), 'Product name should include Vista');

    assert.ok(result.attempts.length >= 1, 'Should have at least 1 attempt logged');
    const lastAttempt = result.attempts[result.attempts.length - 1];
    assert.strictEqual(lastAttempt.status, 'SUCCESS', 'Final attempt must be SUCCESS');
    assert.ok(lastAttempt.duration_ms > 0);
  });

  await t.test('resiliently handles 404/invalid product without crashing', async () => {
    const invalidUrl = 'https://demo.inelabteamdev.com/product/99999999';
    console.log('Testing invalid product URL:', invalidUrl);

    const result = await scrapeWithRetries(invalidUrl, {
      headless: true,
      maxRetries: 1
    });

    assert.strictEqual(result.success, false, 'Invalid product should fail cleanly');
    assert.ok(result.finalError, 'Should have an error message');
    assert.strictEqual(result.price, undefined);
    assert.strictEqual(result.stock, undefined);
    assert.strictEqual(result.attempts[0].status, 'FAILURE');
  });

  t.after(async () => {
    await browserManager.shutdown();
  });
});

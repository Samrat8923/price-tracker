const test = require('node:test');
const assert = require('node:assert');
const { sanitizePrice, sanitizeStock, validateScrapedData } = require('../src/scraper/sanitize');

test('Sanitizer: Price Cleaning and Validation', async (t) => {
  await t.test('handles standard currency formatting', () => {
    assert.strictEqual(sanitizePrice('₹15,335'), 15335);
    assert.strictEqual(sanitizePrice('₹ 1,299.50'), 1299.5);
    assert.strictEqual(sanitizePrice('Rs. 4,500/-'), 4500);
    assert.strictEqual(sanitizePrice('$99.99'), 99.99);
  });

  await t.test('handles all storefront format variations (spaced, euro, trailing, unicode, nbsp, lakh)', () => {
    // 1. Spaced thousands
    assert.strictEqual(sanitizePrice('₹15 335'), 15335);
    assert.strictEqual(sanitizePrice('₹1 500'), 1500);

    // 2. Euro format (comma decimal, dot thousand)
    assert.strictEqual(sanitizePrice('₹15.335,00'), 15335);
    assert.strictEqual(sanitizePrice('₹1.299,50'), 1299.5);

    // 3. Trailing taxes text
    assert.strictEqual(sanitizePrice('₹15,335/- (incl. of all taxes)'), 15335);

    // 4. Unicode fullwidth digits
    assert.strictEqual(sanitizePrice('₹１５３３５'), 15335);

    // 5. Interleaved zero-width & non-breaking spaces
    assert.strictEqual(sanitizePrice('₹\u200B1\u00A05\u200B,\u200B3\u200B3\u200B5'), 15335);

    // 6. Lakh format
    assert.strictEqual(sanitizePrice('Rs.\u00A015,335.00'), 15335);
  });

  await t.test('rejects invalid or non-numeric price inputs', () => {
    assert.strictEqual(sanitizePrice(''), null);
    assert.strictEqual(sanitizePrice('Price hidden'), null);
    assert.strictEqual(sanitizePrice('N/A'), null);
    assert.strictEqual(sanitizePrice(null), null);
    assert.strictEqual(sanitizePrice(undefined), null);
    assert.strictEqual(sanitizePrice(0), null);
    assert.strictEqual(sanitizePrice(-50), null);
    assert.strictEqual(sanitizePrice('₹ -100'), null);
  });
});

test('Sanitizer: Stock Status Cleaning and Validation', async (t) => {
  await t.test('normalizes in-stock with counts', () => {
    assert.strictEqual(sanitizeStock('In stock · 35 left'), 'In Stock (35 units left)');
    assert.strictEqual(sanitizeStock('Only 4 left'), 'In Stock (4 units left)');
    assert.strictEqual(sanitizeStock('12 in stock'), 'In Stock (12 units left)');
  });

  await t.test('normalizes out of stock and general in stock', () => {
    assert.strictEqual(sanitizeStock('Out of stock'), 'Out of Stock');
    assert.strictEqual(sanitizeStock('In Stock'), 'In Stock');
  });

  await t.test('rejects loading, placeholder, or empty states', () => {
    assert.strictEqual(sanitizeStock('Price hidden'), null);
    assert.strictEqual(sanitizeStock('Loading…'), null);
    assert.strictEqual(sanitizeStock('Hold on — checking availability…'), null);
    assert.strictEqual(sanitizeStock(''), null);
    assert.strictEqual(sanitizeStock(null), null);
    assert.strictEqual(sanitizeStock(undefined), null);
  });
});

test('Sanitizer: Overall Scraped Data Validation', () => {
  const valid = validateScrapedData('₹15,335', 'In stock · 35 left');
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.cleanPrice, 15335);
  assert.strictEqual(valid.cleanStock, 'In Stock (35 units left)');

  const missingPrice = validateScrapedData('Price hidden', 'In stock');
  assert.strictEqual(missingPrice.valid, false);
  assert.match(missingPrice.error, /Invalid or missing price/);

  const missingStock = validateScrapedData('₹15,335', 'Loading…');
  assert.strictEqual(missingStock.valid, false);
  assert.match(missingStock.error, /Invalid or missing stock/);

  const bothInvalid = validateScrapedData(null, null);
  assert.strictEqual(bothInvalid.valid, false);
});

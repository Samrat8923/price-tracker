const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../index');
const config = require('../src/config');
const browserManager = require('../src/scraper/browser');

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`API Test Server running on ${baseUrl}`);
      resolve();
    });
  });
});

test.after(async () => {
  await browserManager.shutdown();
  await new Promise((resolve) => server.close(resolve));
});

test('API: Health Check Route', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
  assert.ok(data.database);
  assert.strictEqual(data.database.status, 'healthy');
});

test('API: Products Catalog Search Route', async () => {
  const res = await fetch(`${baseUrl}/api/products/search?q=soundbar`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(typeof data.count, 'number');
  assert.ok(Array.isArray(data.products));
  if (data.products.length > 0) {
    const first = data.products[0];
    assert.ok(first.name);
    assert.ok(first.product_url);
  }
});

test('API: Cron Scrape Authorization Protection', async () => {
  // 1. Without secret
  const unauthRes = await fetch(`${baseUrl}/api/cron/scrape`, { method: 'POST' });
  assert.strictEqual(unauthRes.status, 401);
  const unauthData = await unauthRes.json();
  assert.ok(unauthData.error.includes('Unauthorized'));

  // 2. With wrong secret
  const badSecretRes = await fetch(`${baseUrl}/api/cron/scrape`, {
    method: 'POST',
    headers: { 'x-cron-secret': 'wrong_secret' }
  });
  assert.strictEqual(badSecretRes.status, 401);

  // 3. With correct secret
  const authRes = await fetch(`${baseUrl}/api/cron/scrape`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.cronSecret}` }
  });
  assert.strictEqual(authRes.status, 200);
  const authData = await authRes.json();
  assert.ok(authData.summary);
  assert.strictEqual(typeof authData.summary.total, 'number');
});

test('API: Tracked Products Lifecycle & Scrape Trigger', { timeout: 120000 }, async () => {
  // 1. Create tracked product
  const trackRes = await fetch(`${baseUrl}/api/tracked-products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_name: 'Vista Headphones Neo',
      product_url: 'https://demo.inelabteamdev.com/product/961'
    })
  });
  assert.ok([200, 201].includes(trackRes.status));
  const trackData = await trackRes.json();
  assert.ok(trackData.product);
  const productId = trackData.product.id;
  assert.ok(productId);

  // 2. List tracked products
  const listRes = await fetch(`${baseUrl}/api/tracked-products`);
  assert.strictEqual(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(Array.isArray(list));
  const found = list.find(p => p.id === productId);
  assert.ok(found, 'Product should be in tracked list');

  // 3. Get single product details
  const getRes = await fetch(`${baseUrl}/api/tracked-products/${productId}`);
  assert.strictEqual(getRes.status, 200);
  const single = await getRes.json();
  assert.strictEqual(single.id, productId);
  assert.ok(Array.isArray(single.history));
  assert.ok(Array.isArray(single.logs));

  // 4. Get history endpoint
  const histRes = await fetch(`${baseUrl}/api/tracked-products/${productId}/history`);
  assert.strictEqual(histRes.status, 200);
  const histData = await histRes.json();
  assert.ok(Array.isArray(histData));

  // 5. Get logs endpoint
  const logsRes = await fetch(`${baseUrl}/api/tracked-products/${productId}/logs`);
  assert.strictEqual(logsRes.status, 200);
  const logsData = await logsRes.json();
  assert.ok(Array.isArray(logsData));

  // 6. Delete product
  const delRes = await fetch(`${baseUrl}/api/tracked-products/${productId}`, {
    method: 'DELETE'
  });
  assert.strictEqual(delRes.status, 200);

  // Verify deleted
  const verifyRes = await fetch(`${baseUrl}/api/tracked-products/${productId}`);
  assert.strictEqual(verifyRes.status, 404);
});

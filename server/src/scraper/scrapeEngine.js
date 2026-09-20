const browserManager = require('./browser');
const { validateScrapedData } = require('./sanitize');
const config = require('../config');

/**
 * Perform a single scrape attempt on a given product URL.
 * 
 * @param {string} productUrl 
 * @param {Object} options
 * @param {boolean} [options.headless=true]
 * @param {number} [options.slowMo=0]
 * @param {number} [options.timeoutMs=35000]
 * @returns {Promise<{
 *   success: boolean,
 *   price?: number,
 *   stock?: string,
 *   productName?: string,
 *   productImage?: string,
 *   httpStatus?: number,
 *   durationMs: number,
 *   error?: string
 * }>}
 */
async function scrapeSingleAttempt(productUrl, options = {}) {
  const startTime = Date.now();
  const headless = options.headless !== undefined ? options.headless : config.scraper.headless;
  const slowMo = options.slowMo || 0;
  const timeoutMs = options.timeoutMs || config.scraper.timeoutMs;

  let browserInstance = null;
  let context = null;
  let page = null;
  let lastHttpStatus = null;

  try {
    browserInstance = await browserManager.getBrowser(headless, slowMo);
    const created = await browserManager.createPage(browserInstance);
    context = created.context;
    page = created.page;

    page.setDefaultTimeout(timeoutMs);

    // Track response status
    page.on('response', response => {
      const url = response.url();
      if (url === productUrl || url.includes('/product/')) {
        lastHttpStatus = response.status();
      }
    });

    // 1. Navigate to target URL
    const response = await page.goto(productUrl, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs
    });

    if (response) {
      lastHttpStatus = response.status();
      if (lastHttpStatus >= 400) {
        throw new Error(`Storefront returned HTTP ${lastHttpStatus}`);
      }
    }

    // Dismiss any cookie overlay or modal if present
    try {
      const cookieOverlay = page.locator('.cookie-overlay, .cookie-consent, [class*="cookie"]');
      if (await cookieOverlay.first().isVisible({ timeout: 1000 })) {
        const acceptBtn = cookieOverlay.locator('button').first();
        if (await acceptBtn.isVisible()) {
          await acceptBtn.click({ force: true });
        } else {
          // Remove from DOM if overlay blocks clicks
          await page.evaluate(() => {
            document.querySelectorAll('.cookie-overlay, [class*="cookie"]').forEach(el => el.remove());
          });
        }
      }
    } catch {
      // Cookie banner is optional
    }

    // 2. Extract Product Name (H1 or .detail-title)
    const titleLocator = page.locator('h1, .detail-title').first();
    await titleLocator.waitFor({ state: 'visible', timeout: 8000 });
    const productName = (await titleLocator.textContent()).trim();
    if (!productName) {
      throw new Error('Product title element found but text is empty');
    }

    // 3. Extract Product Image if available
    let productImage = null;
    try {
      const imgLocator = page.locator('.detail-image img, main img').first();
      if (await imgLocator.count() > 0 && await imgLocator.isVisible()) {
        productImage = await imgLocator.getAttribute('src');
      }
    } catch {
      // Image is optional
    }

    // 4. Locate Price Interaction Block
    const priceBlock = page.locator('.price-block, .price-idle, [class*="price-block"]').first();
    await priceBlock.waitFor({ state: 'visible', timeout: 10000 });

    // Check if price is already revealed
    let isAlreadyRevealed = await page.locator('.price-success, .stock-badge').first().isVisible().catch(() => false);

    if (!isAlreadyRevealed) {
      // Scroll price block into view
      await priceBlock.scrollIntoViewIfNeeded();

      // Storefront human interaction detector: minMoves: 8, minDwellMs: 600
      const box = await priceBlock.boundingBox();
      if (!box) {
        throw new Error('Could not find bounding box for price-block to simulate interaction');
      }

      // Move mouse across the price box to satisfy human interaction detector
      for (let i = 0; i < 14; i++) {
        const x = box.x + 15 + ((i * 20) % Math.max(10, box.width - 30));
        const y = box.y + 15 + ((i * 15) % Math.max(10, box.height - 30));
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);
      }

      // Wait for dwell time threshold (600ms requirement)
      await page.waitForTimeout(750);

      // Locate "Reveal price" button
      const revealBtn = page.locator('button[aria-label="Reveal price"], button:has-text("Reveal price")').first();
      await revealBtn.waitFor({ state: 'visible', timeout: 5000 });

      // If button still disabled, execute additional movement
      if (!(await revealBtn.isEnabled())) {
        for (let i = 0; i < 10; i++) {
          await page.mouse.move(box.x + 20 + i * 10, box.y + 20);
          await page.waitForTimeout(60);
        }
        await page.waitForTimeout(700);
      }

      // Click to reveal price (use force: true to prevent overlay interference)
      await revealBtn.click({ timeout: 5000, force: true });

      // 5. Wait for price load to complete (.price-success state or .stock-badge)
      await page.waitForSelector('.price-success, .stock-badge', { timeout: 18000 });
    }

    // Small stabilization pause for DOM to render formatted price
    await page.waitForTimeout(300);

    // 6. Extract Raw Price and Stock from DOM
    const extractionResult = await page.evaluate(() => {
      // Find stock badge
      const stockEl = document.querySelector('.stock-badge') || 
                      document.querySelector('[class*="stock"]') ||
                      document.querySelector('.detail-stock');
      const stockText = stockEl ? stockEl.textContent.trim() : null;

      // Extract real price from .price-main, deliberately ignoring hidden decoys
      const priceMain = document.querySelector('.price-main');
      let genuinePriceText = null;

      if (priceMain) {
        for (const child of priceMain.children) {
          // Ignore decoy elements marked with aria-hidden="true" or inline display: none
          if (child.getAttribute('aria-hidden') === 'true' || 
              child.style.display === 'none' ||
              child.classList.contains('amount')) {
            continue;
          }

          // Ignore strikethrough MRP or percentage badge or updating indicator
          if (child.style.textDecoration === 'line-through' ||
              child.textContent.includes('off') ||
              child.textContent.includes('Updating')) {
            continue;
          }

          // Check for price carrier containing currency symbol or digits
          const txt = child.textContent.trim();
          if (txt.includes('₹') || txt.includes('Rs.') || /\d/.test(txt)) {
            genuinePriceText = txt;
            break;
          }
        }
      }

      // Fallback: If not in .price-main children, look for visible element containing rupee symbol
      if (!genuinePriceText) {
        const visibleSpans = Array.from(document.querySelectorAll('.price-block span, .price-block div'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   el.getAttribute('aria-hidden') !== 'true' &&
                   style.textDecoration !== 'line-through';
          });
        
        for (const el of visibleSpans) {
          const txt = el.textContent.trim();
          if (txt.includes('₹') && !txt.includes('off') && !txt.includes('Deal')) {
            genuinePriceText = txt;
            break;
          }
        }
      }

      return {
        rawPrice: genuinePriceText,
        rawStock: stockText
      };
    });

    // 7. Validate Extracted Data
    const validation = validateScrapedData(extractionResult.rawPrice, extractionResult.rawStock);
    if (!validation.valid) {
      throw new Error(`Data validation failed: ${validation.error}`);
    }

    const durationMs = Date.now() - startTime;
    return {
      success: true,
      price: validation.cleanPrice,
      stock: validation.cleanStock,
      productName,
      productImage,
      httpStatus: lastHttpStatus || 200,
      durationMs
    };

  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: err.message || 'Scrape attempt failed',
      httpStatus: lastHttpStatus || null,
      durationMs
    };
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {
        // ignore
      }
    }
    if (browserInstance && (!headless || slowMo > 0)) {
      await browserManager.closeBrowser(browserInstance);
    }
  }
}

/**
 * Execute resilient scraper with exponential backoff and audit logging.
 */
async function scrapeWithRetries(productUrl, options = {}) {
  const maxRetries = options.maxRetries || config.scraper.maxRetries;
  const attempts = [];

  for (let attemptNumber = 1; attemptNumber <= maxRetries; attemptNumber++) {
    const attemptResult = await scrapeSingleAttempt(productUrl, options);
    
    const attemptLog = {
      attempt_number: attemptNumber,
      status: attemptResult.success ? 'SUCCESS' : 'FAILURE',
      started_at: new Date(Date.now() - attemptResult.durationMs).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: attemptResult.durationMs,
      error_message: attemptResult.error || null,
      http_status: attemptResult.httpStatus || null
    };

    attempts.push(attemptLog);

    if (options.onAttempt) {
      try {
        await options.onAttempt(attemptLog);
      } catch (logErr) {
        console.error('Error in onAttempt callback:', logErr.message);
      }
    }

    if (attemptResult.success) {
      return {
        success: true,
        price: attemptResult.price,
        stock: attemptResult.stock,
        productName: attemptResult.productName,
        productImage: attemptResult.productImage,
        attempts
      };
    }

    // If not successful and we have retries remaining, wait with backoff
    if (attemptNumber < maxRetries) {
      const backoffMs = config.scraper.retryBackoffBaseMs * attemptNumber + Math.floor(Math.random() * 500);
      console.warn(`Scrape attempt ${attemptNumber} failed: ${attemptResult.error}. Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  // All retries exhausted
  const lastAttempt = attempts[attempts.length - 1];
  return {
    success: false,
    finalError: lastAttempt ? lastAttempt.error_message : 'All retry attempts exhausted',
    attempts
  };
}

module.exports = {
  scrapeSingleAttempt,
  scrapeWithRetries
};

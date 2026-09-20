const { chromium } = require('playwright');
const config = require('../config');

class BrowserManager {
  constructor() {
    this.browser = null;
  }

  /**
   * Launch or return existing chromium browser.
   * @param {boolean} [headless=true] 
   * @param {number} [slowMo=0] 
   * @returns {Promise<import('playwright').Browser>}
   */
  async getBrowser(headless = config.scraper.headless, slowMo = 0) {
    // For headed mode or slowMo, launch dedicated browser instance
    if (!headless || slowMo > 0) {
      return chromium.launch({
        headless: false,
        slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ]
      });
    }

    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Create an isolated page context with realistic viewport and user-agent.
   * @param {import('playwright').Browser} browser 
   * @returns {Promise<{ context: import('playwright').BrowserContext, page: import('playwright').Page }>}
   */
  async createPage(browser) {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata'
    });

    const page = await context.newPage();
    return { context, page };
  }

  /**
   * Safely close a browser instance or context.
   * @param {import('playwright').Browser} [browserInstance]
   */
  async closeBrowser(browserInstance) {
    try {
      if (browserInstance && browserInstance !== this.browser) {
        await browserInstance.close();
      }
    } catch (e) {
      console.error('Error closing browser instance:', e.message);
    }
  }

  /**
   * Shutdown shared browser on process exit.
   */
  async shutdown() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        // ignore on shutdown
      }
      this.browser = null;
    }
  }
}

module.exports = new BrowserManager();

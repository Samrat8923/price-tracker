require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  cronSecret: process.env.CRON_SECRET || 'dev_cron_secret_ine_2026',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
  },
  scraper: {
    headless: process.env.SCRAPER_HEADLESS !== 'false',
    timeoutMs: parseInt(process.env.SCRAPER_TIMEOUT_MS, 10) || 35000,
    maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES, 10) || 3,
    retryBackoffBaseMs: 1500,
    storefrontBaseUrl: process.env.STOREFRONT_BASE_URL || 'https://demo.inelabteamdev.com'
  }
};

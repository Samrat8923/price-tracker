#!/usr/bin/env node

/**
 * Headed Scraper CLI for Observable Playwright Demonstration
 * Usage:
 *   npm run scrape:headed -- https://demo.inelabteamdev.com/product/961
 *   npm run scrape:test -- https://demo.inelabteamdev.com/product/961 (dry run / safe mode)
 */

const { scrapeWithRetries } = require('./scrapeEngine');
const browserManager = require('./browser');

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  const urlArg = args.find(a => !a.startsWith('-')) || 'https://demo.inelabteamdev.com/product/961';

  console.log('====================================================');
  console.log('  INE Product Price Tracker — Observable Scraper   ');
  console.log('====================================================');
  console.log(`Target URL : ${urlArg}`);
  console.log(`Mode       : Headed (visible browser window, slowMo: 400ms)`);
  console.log(`Dry Run    : ${isDryRun ? 'YES (safe test, no DB writes)' : 'NO'}`);
  console.log('----------------------------------------------------');
  console.log('Launching visible Chromium browser...\n');

  try {
    const result = await scrapeWithRetries(urlArg, {
      headless: false,
      slowMo: 400, // Visual delay so observer can watch cursor hover and price reveal
      maxRetries: 2,
      onAttempt: (attempt) => {
        console.log(`[Attempt ${attempt.attempt_number}] Status: ${attempt.status} | Duration: ${attempt.duration_ms}ms`);
        if (attempt.error_message) {
          console.log(`  Error: ${attempt.error_message}`);
        }
      }
    });

    console.log('\n----------------------------------------------------');
    if (result.success) {
      console.log(' SCRAPE SUCCESSFUL!');
      console.log(`  Product Name : ${result.productName}`);
      console.log(`  Current Price: ₹${result.price}`);
      console.log(`  Current Stock: ${result.stock}`);
      console.log(`  Attempts Used: ${result.attempts.length}`);
    } else {
      console.log('❌ SCRAPE FAILED');
      console.log(`  Final Error  : ${result.finalError}`);
      console.log(`  Total Attempts: ${result.attempts.length}`);
    }
    console.log('====================================================\n');

  } catch (err) {
    console.error('Fatal CLI Error:', err);
  } finally {
    await browserManager.shutdown();
    process.exit(0);
  }
}

main();

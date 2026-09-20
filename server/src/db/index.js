const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const isProduction = process.env.NODE_ENV === 'production';

const hasSupabaseCredentials = Boolean(
  config.supabase.url &&
  config.supabase.key &&
  !config.supabase.url.includes('your-project')
);

let supabaseClient = null;
if (hasSupabaseCredentials) {
  try {
    supabaseClient = createClient(config.supabase.url, config.supabase.key, {
      auth: { persistSession: false }
    });
    console.log(`[DB] Configured for Supabase PostgreSQL at ${config.supabase.url}`);
  } catch (err) {
    console.error('[DB] Failed to initialize Supabase client:', err.message);
    if (isProduction) {
      throw new Error(`[DB FATAL] Failed to initialize Supabase client in production: ${err.message}`);
    }
  }
} else {
  if (isProduction) {
    throw new Error('[DB FATAL] Production mode requires valid Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY). Silent fallback to local storage is strictly disabled in production.');
  }
  console.log('[DB] No Supabase credentials detected. Running in local fallback DB mode (server/data/local_db.json)');
}

// Local Fallback DB Manager (used for local testing only without cloud credentials)
class LocalFallbackDB {
  constructor() {
    if (isProduction) {
      throw new Error('[DB FATAL] Local fallback database cannot be used in production mode.');
    }
    this.dataDir = path.join(__dirname, '../../data');
    this.filePath = path.join(this.dataDir, 'local_db.json');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      const initial = {
        tracked_products: [],
        price_history: [],
        scrape_logs: []
      };
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2));
    }
  }

  read() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { tracked_products: [], price_history: [], scrape_logs: [] };
    }
  }

  write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }
}

const localDb = (!hasSupabaseCredentials && !isProduction) ? new LocalFallbackDB() : null;

module.exports = {
  isSupabase: hasSupabaseCredentials && !!supabaseClient,
  supabase: supabaseClient,
  localDb
};

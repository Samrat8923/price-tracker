const crypto = require('crypto');
const { isSupabase, supabase, localDb } = require('./index');

class Repository {
  /**
   * Health check for database connectivity.
   */
  async checkHealth() {
    if (isSupabase) {
      try {
        const { error } = await supabase.from('tracked_products').select('id').limit(1);
        if (error) throw error;
        return { status: 'healthy', provider: 'Supabase' };
      } catch (err) {
        return { status: 'unhealthy', provider: 'Supabase', error: err.message };
      }
    }
    return { status: 'healthy', provider: 'Local Fallback' };
  }

  /**
   * Fetch all tracked products with their latest price and stock status.
   */
  async getTrackedProducts() {
    if (isSupabase) {
      let products;
      const { data, error } = await supabase
        .from('tracked_products')
        .select(`
          *,
          price_history (
            id,
            price,
            stock_status,
            scraped_at
          ),
          scrape_logs (
            id,
            status,
            trigger_type,
            started_at,
            completed_at,
            duration_ms
          )
        `)
        .order('created_at', { ascending: false });

      if (error && error.message && error.message.includes('trigger_type')) {
        // Safe fallback if column was not yet added to Supabase table
        const fallback = await supabase
          .from('tracked_products')
          .select(`
            *,
            price_history (
              id,
              price,
              stock_status,
              scraped_at
            ),
            scrape_logs (
              id,
              status,
              started_at,
              completed_at,
              duration_ms
            )
          `)
          .order('created_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        products = fallback.data;
      } else if (error) {
        throw error;
      } else {
        products = data;
      }

      return products.map(p => {
        // Sort price history descending by scraped_at
        const history = (p.price_history || []).sort(
          (a, b) => new Date(b.scraped_at) - new Date(a.scraped_at)
        );
        const latestPrice = history[0] || null;
        const previousPrice = history.length >= 2 ? history[1] : null;

        const logs = (p.scrape_logs || []).sort(
          (a, b) => new Date(b.completed_at || b.started_at || 0) - new Date(a.completed_at || a.started_at || 0)
        );
        const latestLog = logs[0] || null;

        // Calculate latest automatic run from actual AUTOMATIC records only
        const automaticLogs = (p.scrape_logs || []).filter(
          l => l.trigger_type === 'AUTOMATIC' && l.status === 'SUCCESS'
        ).sort(
          (a, b) => new Date(b.completed_at || b.started_at || 0) - new Date(a.completed_at || a.started_at || 0)
        );
        const latestAuto = automaticLogs[0] || null;
        const last_automatic_scrape_at = latestAuto ? (latestAuto.completed_at || latestAuto.started_at) : null;
        const next_automatic_scrape_at = last_automatic_scrape_at
          ? new Date(new Date(last_automatic_scrape_at).getTime() + 2 * 60 * 60 * 1000).toISOString()
          : null;

        const catalogService = require('../services/catalogService');
        const sku = catalogService.getSkuByUrl(p.product_url);

        return {
          id: p.id,
          product_name: p.product_name,
          product_url: p.product_url,
          product_image: p.product_image,
          sku: sku,
          is_active: p.is_active,
          created_at: p.created_at,
          updated_at: p.updated_at,
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
          history_count: history.length
        };
      });
    }

    // Local fallback
    const db = localDb.read();
    const catalogService = require('../services/catalogService');
    return db.tracked_products
      .slice()
      .reverse()
      .map(p => {
        const history = db.price_history
          .filter(h => h.tracked_product_id === p.id)
          .sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
        const latestPrice = history[0] || null;
        const previousPrice = history.length >= 2 ? history[1] : null;

        const logs = db.scrape_logs
          .filter(l => l.tracked_product_id === p.id)
          .sort((a, b) => new Date(b.completed_at || b.started_at || 0) - new Date(a.completed_at || a.started_at || 0));
        const latestLog = logs[0] || null;

        const automaticLogs = logs.filter(l => l.trigger_type === 'AUTOMATIC' && l.status === 'SUCCESS');
        const latestAuto = automaticLogs[0] || null;
        const last_automatic_scrape_at = latestAuto ? (latestAuto.completed_at || latestAuto.started_at) : null;
        const next_automatic_scrape_at = last_automatic_scrape_at
          ? new Date(new Date(last_automatic_scrape_at).getTime() + 2 * 60 * 60 * 1000).toISOString()
          : null;

        const sku = catalogService.getSkuByUrl(p.product_url);

        return {
          id: p.id,
          product_name: p.product_name,
          product_url: p.product_url,
          product_image: p.product_image,
          sku: sku,
          is_active: p.is_active,
          created_at: p.created_at,
          updated_at: p.updated_at,
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
          history_count: history.length
        };
      });
  }

  /**
   * Fetch a single tracked product by ID.
   */
  async getTrackedProductById(id) {
    if (isSupabase) {
      const { data, error } = await supabase
        .from('tracked_products')
        .select('*')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    }

    const db = localDb.read();
    return db.tracked_products.find(p => p.id === id) || null;
  }

  /**
   * Find product by URL to prevent duplicates.
   */
  async findTrackedProductByUrl(productUrl) {
    if (isSupabase) {
      const { data, error } = await supabase
        .from('tracked_products')
        .select('*')
        .eq('product_url', productUrl)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    }

    const db = localDb.read();
    return db.tracked_products.find(p => p.product_url === productUrl) || null;
  }

  /**
   * Create a new tracked product.
   */
  async createTrackedProduct({ product_name, product_url, product_image }) {
    const now = new Date().toISOString();
    if (isSupabase) {
      const { data, error } = await supabase
        .from('tracked_products')
        .insert({
          product_name,
          product_url,
          product_image: product_image || null,
          is_active: true
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = localDb.read();
    const newProduct = {
      id: crypto.randomUUID(),
      product_name,
      product_url,
      product_image: product_image || null,
      is_active: true,
      created_at: now,
      updated_at: now
    };
    db.tracked_products.push(newProduct);
    localDb.write(db);
    return newProduct;
  }

  /**
   * Update tracked product attributes (e.g. is_active, name).
   */
  async updateTrackedProduct(id, updates) {
    const now = new Date().toISOString();
    if (isSupabase) {
      const { data, error } = await supabase
        .from('tracked_products')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = localDb.read();
    const idx = db.tracked_products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.tracked_products[idx] = { ...db.tracked_products[idx], ...updates, updated_at: now };
    localDb.write(db);
    return db.tracked_products[idx];
  }

  /**
   * Delete tracked product and cascade child records.
   */
  async deleteTrackedProduct(id) {
    if (isSupabase) {
      const { error } = await supabase
        .from('tracked_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    }

    const db = localDb.read();
    db.tracked_products = db.tracked_products.filter(p => p.id !== id);
    db.price_history = db.price_history.filter(h => h.tracked_product_id !== id);
    db.scrape_logs = db.scrape_logs.filter(l => l.tracked_product_id !== id);
    localDb.write(db);
    return true;
  }

  /**
   * Fetch price history for a given tracked product.
   */
  async getPriceHistory(trackedProductId) {
    if (isSupabase) {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('tracked_product_id', trackedProductId)
        .order('scraped_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(h => ({ ...h, price: Number(h.price) }));
    }

    const db = localDb.read();
    return db.price_history
      .filter(h => h.tracked_product_id === trackedProductId)
      .sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at))
      .map(h => ({ ...h, price: Number(h.price) }));
  }

  /**
   * Insert a valid price history entry.
   */
  async addPriceHistory({ tracked_product_id, price, stock_status, scraped_at }) {
    const record = {
      tracked_product_id,
      price: Number(price),
      stock_status,
      scraped_at: scraped_at || new Date().toISOString()
    };

    if (isSupabase) {
      const { data, error } = await supabase
        .from('price_history')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return { ...data, price: Number(data.price) };
    }

    const db = localDb.read();
    const newEntry = {
      id: crypto.randomUUID(),
      ...record
    };
    db.price_history.push(newEntry);
    localDb.write(db);
    return newEntry;
  }

  /**
   * Fetch scrape logs for a given tracked product.
   */
  async getScrapeLogs(trackedProductId) {
    if (isSupabase) {
      const { data, error } = await supabase
        .from('scrape_logs')
        .select('*')
        .eq('tracked_product_id', trackedProductId)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    const db = localDb.read();
    return db.scrape_logs
      .filter(l => l.tracked_product_id === trackedProductId)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  }

  /**
   * Insert a scrape log attempt.
   */
  async addScrapeLog(logData) {
    const trigger_type = logData.trigger_type === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL';
    const record = {
      tracked_product_id: logData.tracked_product_id,
      attempt_number: logData.attempt_number || 1,
      trigger_type: trigger_type,
      status: logData.status,
      started_at: logData.started_at || new Date().toISOString(),
      completed_at: logData.completed_at || new Date().toISOString(),
      duration_ms: logData.duration_ms || 0,
      error_message: logData.error_message || null,
      http_status: logData.http_status || null
    };

    if (isSupabase) {
      try {
        const { data, error } = await supabase
          .from('scrape_logs')
          .insert(record)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (insertErr) {
        if (insertErr.message && insertErr.message.includes('trigger_type')) {
          const { trigger_type: _, ...legacyRecord } = record;
          const { data, error } = await supabase
            .from('scrape_logs')
            .insert(legacyRecord)
            .select()
            .single();
          if (error) throw error;
          return { ...data, trigger_type };
        }
        throw insertErr;
      }
    }

    const db = localDb.read();
    const newLog = {
      id: crypto.randomUUID(),
      ...record
    };
    db.scrape_logs.push(newLog);
    localDb.write(db);
    return newLog;
  }

  /**
   * Fetch all active tracked products for scheduled batch scraping.
   */
  async getActiveTrackedProducts() {
    if (isSupabase) {
      const { data, error } = await supabase
        .from('tracked_products')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    }

    const db = localDb.read();
    return db.tracked_products.filter(p => p.is_active);
  }
}

module.exports = new Repository();

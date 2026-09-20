const config = require('../config');

class CatalogService {
  constructor() {
    this.cache = null;
    this.cacheExpiresAt = 0;
    this.cacheTtlMs = 15 * 60 * 1000; // 15 minutes
    this.baseUrl = config.scraper.storefrontBaseUrl;
  }

  /**
   * Fetch all products from INE storefront catalog API.
   * Caches in memory for fast instant searching.
   * 
   * @returns {Promise<Array<Object>>}
   */
  async getCatalog() {
    const now = Date.now();
    if (this.cache && now < this.cacheExpiresAt) {
      return this.cache;
    }

    try {
      const allItems = [];
      const pageSize = 60;
      let page = 1;
      let totalPages = 1;

      // Fetch first page to learn total pages
      const firstRes = await fetch(`${this.baseUrl}/api/catalog?page=1&pageSize=${pageSize}`);
      if (!firstRes.ok) {
        throw new Error(`Catalog API returned HTTP ${firstRes.status}`);
      }

      const firstData = await firstRes.json();
      totalPages = firstData.pages || Math.ceil((firstData.total || 1000) / pageSize);
      if (Array.isArray(firstData.items)) {
        allItems.push(...firstData.items);
      }

      // Fetch remaining pages (up to 17 pages for 1000 items)
      const pagePromises = [];
      for (let p = 2; p <= Math.min(totalPages, 20); p++) {
        pagePromises.push(
          fetch(`${this.baseUrl}/api/catalog?page=${p}&pageSize=${pageSize}`)
            .then(res => res.ok ? res.json() : { items: [] })
            .then(data => data.items || [])
            .catch(() => [])
        );
      }

      const remainingPages = await Promise.all(pagePromises);
      for (const items of remainingPages) {
        allItems.push(...items);
      }

      // Deduplicate by ID
      const seen = new Set();
      const uniqueItems = [];
      for (const item of allItems) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          uniqueItems.push({
            id: item.id,
            name: item.name,
            brand: item.brand,
            category: item.category,
            sku: item.sku,
            description: item.description,
            product_url: `${this.baseUrl}/product/${item.id}`,
            product_image: null
          });
        }
      }

      this.cache = uniqueItems;
      this.cacheExpiresAt = now + this.cacheTtlMs;
      console.log(`[Catalog] Loaded & cached ${this.cache.length} products from storefront`);
      return this.cache;

    } catch (err) {
      console.error('[Catalog] Error loading catalog:', err.message);
      // If cache exists even if expired, return it as fallback
      if (this.cache && this.cache.length > 0) {
        return this.cache;
      }
      return [];
    }
  }

  /**
   * Search catalog products by partial or full product name (case-insensitive).
   * Also searches brand, sku, and category.
   * 
   * @param {string} query 
   * @param {number} [limit=20] 
   * @returns {Promise<Array<Object>>}
   */
  async search(query = '', limit = 30) {
    const q = (query || '').trim().toLowerCase();
    const items = await this.getCatalog();

    if (!q) {
      return items.slice(0, limit);
    }

    const matches = items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      const category = (item.category || '').toLowerCase();

      return name.includes(q) ||
             brand.includes(q) ||
             sku.includes(q) ||
             category.includes(q);
    });

    return matches.slice(0, limit);
  }

  /**
   * Look up SKU from product URL or ID.
   * 
   * @param {string} url 
   * @returns {string|null}
   */
  getSkuByUrl(url) {
    if (!url) return null;
    const match = String(url).match(/\/product\/(\d+)/);
    if (!match) return null;
    const id = parseInt(match[1], 10);
    if (this.cache) {
      const found = this.cache.find(item => item.id === id);
      if (found && found.sku) return found.sku;
    }
    return `INE-${id}`;
  }
}

module.exports = new CatalogService();


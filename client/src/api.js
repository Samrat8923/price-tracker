const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `HTTP ${response.status}: Request failed`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  getHealth: () => request('/api/health'),
  
  searchProducts: (query) => 
    request(`/api/products/search?q=${encodeURIComponent(query || '')}`),

  getTrackedProducts: () => 
    request('/api/tracked-products'),

  getTrackedProductById: (id) => 
    request(`/api/tracked-products/${id}`),

  trackProduct: (productData) => 
    request('/api/tracked-products', {
      method: 'POST',
      body: JSON.stringify(productData)
    }),

  scrapeProductNow: (id) => 
    request(`/api/tracked-products/${id}/scrape`, {
      method: 'POST'
    }),

  deleteTrackedProduct: (id) => 
    request(`/api/tracked-products/${id}`, {
      method: 'DELETE'
    }),

  getPriceHistory: (id) => 
    request(`/api/tracked-products/${id}/history`),

  getScrapeLogs: (id) => 
    request(`/api/tracked-products/${id}/logs`),

  triggerCronScrape: (secret) => 
    request('/api/cron/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${secret}` }
    })
};

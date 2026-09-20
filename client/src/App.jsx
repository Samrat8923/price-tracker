import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from './components/Header';
import TopMetrics from './components/TopMetrics';
import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import DashboardToolbar from './components/DashboardToolbar';
import TrackedProductList from './components/TrackedProductList';
import ProductDetailModal from './components/ProductDetailModal';
import EmptyState from './components/EmptyState';
import { api } from './api';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState(null);
  const [scrapingIds, setScrapingIds] = useState(new Set());
  
  // Modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalInitialTab, setModalInitialTab] = useState('chart');

  // Tracked products filtering and sorting
  const [trackedSearchQuery, setTrackedSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'in_stock' | 'out_of_stock' | 'issues'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'price_asc' | 'price_desc' | 'name'

  // Notification state
  const [notification, setNotification] = useState(null);

  const searchSectionRef = useRef(null);

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Load tracked products
  const loadTrackedProducts = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const data = await api.getTrackedProducts();
      setTrackedProducts(data || []);
    } catch (err) {
      showNotification(`Failed to load tracked products: ${err.message}`, 'error');
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTrackedProducts();
  }, []);

  // Map of tracked products keyed by product_url for fast O(1) lookup
  const trackedProductsByUrl = useMemo(() => {
    const map = {};
    for (const p of trackedProducts) {
      map[p.product_url] = p;
    }
    return map;
  }, [trackedProducts]);

  const trackedUrls = useMemo(() => {
    return new Set(Object.keys(trackedProductsByUrl));
  }, [trackedProductsByUrl]);

  // Catalog search
  const handleCatalogSearch = async (query) => {
    setCatalogSearchQuery(query);
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearchingCatalog(true);
    try {
      const data = await api.searchProducts(query);
      setSearchResults(data.products || []);
    } catch (err) {
      showNotification(`Search error: ${err.message}`, 'error');
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  // Track a product
  const handleTrackProduct = async (product) => {
    setTrackingUrl(product.product_url);
    try {
      const res = await api.trackProduct({
        product_name: product.name,
        product_url: product.product_url,
        product_image: product.product_image
      });

      showNotification(`"${product.name}" is now tracked! Initial scrape completed.`);
      await loadTrackedProducts();
      if (res.product) {
        setSelectedProduct(res.product);
        setModalInitialTab('chart');
      }
    } catch (err) {
      showNotification(`Tracking failed: ${err.message}`, 'error');
    } finally {
      setTrackingUrl(null);
    }
  };

  // Run immediate scrape
  const handleScrapeNow = async (id) => {
    setScrapingIds(prev => new Set(prev).add(id));
    try {
      const res = await api.scrapeProductNow(id);
      if (res.scrapeResult?.success) {
        showNotification(`Scrape successful! Price: ₹${res.scrapeResult.price}, Stock: ${res.scrapeResult.stock}`);
      } else {
        showNotification(`Scrape failed: ${res.scrapeResult?.error || 'Validation error'}`, 'error');
      }
      await loadTrackedProducts();
      if (selectedProduct && selectedProduct.id === id) {
        setSelectedProduct(res.product);
      }
    } catch (err) {
      showNotification(`Scrape error: ${err.message}`, 'error');
    } finally {
      setScrapingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Delete product
  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to stop tracking "${name}"?`)) {
      return;
    }

    try {
      await api.deleteTrackedProduct(id);
      showNotification(`Removed "${name}" from tracking.`);
      setTrackedProducts(prev => prev.filter(p => p.id !== id));
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
      }
    } catch (err) {
      showNotification(`Failed to delete: ${err.message}`, 'error');
    }
  };

  // Open modal with specific tab
  const handleSelectProduct = (product, tab = 'chart') => {
    setSelectedProduct(product);
    setModalInitialTab(tab);
  };

  // Scroll to search input from empty state
  const handleBrowseClick = () => {
    if (searchSectionRef.current) {
      searchSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      const input = searchSectionRef.current.querySelector('input');
      if (input) input.focus();
    }
  };

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const inStock = trackedProducts.filter(
      p => p.current_stock && !p.current_stock.toLowerCase().includes('out of stock')
    ).length;
    const outOfStock = trackedProducts.filter(
      p => p.current_stock && p.current_stock.toLowerCase().includes('out of stock')
    ).length;
    const issues = trackedProducts.filter(
      p => p.last_scrape_status === 'FAILURE'
    ).length;

    return {
      all: trackedProducts.length,
      inStock,
      outOfStock,
      issues
    };
  }, [trackedProducts]);

  // Filtered and sorted tracked products
  const displayedTrackedProducts = useMemo(() => {
    let list = [...trackedProducts];

    // 1. Text Search Filter (name or SKU)
    if (trackedSearchQuery.trim()) {
      const q = trackedSearchQuery.trim().toLowerCase();
      list = list.filter(p => {
        const name = (p.product_name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return name.includes(q) || sku.includes(q);
      });
    }

    // 2. Status Tab Filter
    if (activeFilter === 'in_stock') {
      list = list.filter(p => p.current_stock && !p.current_stock.toLowerCase().includes('out of stock'));
    } else if (activeFilter === 'out_of_stock') {
      list = list.filter(p => p.current_stock && p.current_stock.toLowerCase().includes('out of stock'));
    } else if (activeFilter === 'issues') {
      list = list.filter(p => p.last_scrape_status === 'FAILURE');
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = new Date(a.last_scraped_at || a.created_at || 0);
        const dateB = new Date(b.last_scraped_at || b.created_at || 0);
        return dateB - dateA;
      }
      if (sortBy === 'price_asc') {
        const priceA = a.current_price !== null ? Number(a.current_price) : Infinity;
        const priceB = b.current_price !== null ? Number(b.current_price) : Infinity;
        return priceA - priceB;
      }
      if (sortBy === 'price_desc') {
        const priceA = a.current_price !== null ? Number(a.current_price) : -Infinity;
        const priceB = b.current_price !== null ? Number(b.current_price) : -Infinity;
        return priceB - priceA;
      }
      if (sortBy === 'name') {
        return (a.product_name || '').localeCompare(b.product_name || '');
      }
      return 0;
    });

    return list;
  }, [trackedProducts, trackedSearchQuery, activeFilter, sortBy]);

  const isFiltered = trackedSearchQuery.trim() !== '' || activeFilter !== 'all';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <Header
        trackedCount={trackedProducts.length}
        onRefreshAll={() => loadTrackedProducts(true)}
        isRefreshing={isRefreshing}
      />

      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 text-xs font-medium border ${
              notification.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/95 border-rose-500/40 text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Top Executive Metrics Summary */}
        <TopMetrics products={trackedProducts} />

        {/* Storefront Catalog Search Section */}
        <div ref={searchSectionRef} className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm mb-8">
          <div className="mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              SEARCH STOREFRONT PRODUCTS
            </h2>
          </div>

          <SearchBar
            onSearch={handleCatalogSearch}
            isSearching={isSearchingCatalog}
          />

          <SearchResults
            results={searchResults}
            trackedUrls={trackedUrls}
            trackedProductsByUrl={trackedProductsByUrl}
            onTrackProduct={handleTrackProduct}
            onOpenTrackedProduct={(prod) => handleSelectProduct(prod, 'chart')}
            trackingUrl={trackingUrl}
            query={catalogSearchQuery}
          />
        </div>

        {/* Tracked Products Section */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Tracked Products
            </h2>
          </div>

          {/* If there are tracked products, show the Toolbar */}
          {trackedProducts.length > 0 && (
            <DashboardToolbar
              searchQuery={trackedSearchQuery}
              onSearchChange={setTrackedSearchQuery}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              counts={filterCounts}
            />
          )}

          {/* Tracked Products List or Empty State */}
          {trackedProducts.length === 0 ? (
            <EmptyState onBrowseClick={handleBrowseClick} />
          ) : (
            <TrackedProductList
              products={displayedTrackedProducts}
              onSelectProduct={handleSelectProduct}
              onScrapeNow={handleScrapeNow}
              onDeleteProduct={handleDeleteProduct}
              scrapingIds={scrapingIds}
              onResetFilters={() => {
                setTrackedSearchQuery('');
                setActiveFilter('all');
              }}
              isFiltered={isFiltered}
            />
          )}
        </section>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          initialTab={modalInitialTab}
          onClose={() => setSelectedProduct(null)}
          onScrapeNow={handleScrapeNow}
          isScraping={scrapingIds.has(selectedProduct.id)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>INE Product Price Tracker — Resilient Playwright Automation & Supabase PostgreSQL</p>
      </footer>
    </div>
  );
}

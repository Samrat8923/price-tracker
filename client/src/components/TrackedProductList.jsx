import React from 'react';
import TrackedProductCard from './TrackedProductCard';
import { Package, X } from 'lucide-react';

export default function TrackedProductList({
  products = [],
  onSelectProduct,
  onScrapeNow,
  onDeleteProduct,
  scrapingIds = new Set(),
  onResetFilters,
  isFiltered = false
}) {
  if (products.length === 0) {
    if (isFiltered) {
      return (
        <div className="py-12 px-4 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <Package className="h-10 w-10 mx-auto text-slate-500 mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-white">No products match your current filter</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or switching between filter tabs.
          </p>
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="mt-4 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      );
    }
    return null; // EmptyState component handles global empty state
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <TrackedProductCard
          key={product.id}
          product={product}
          onSelectProduct={onSelectProduct}
          onScrapeNow={onScrapeNow}
          onDeleteProduct={onDeleteProduct}
          isScraping={scrapingIds.has(product.id)}
        />
      ))}
    </div>
  );
}

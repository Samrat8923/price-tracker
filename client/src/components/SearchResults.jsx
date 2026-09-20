import React from 'react';
import { PlusCircle, CheckCircle2, ExternalLink, Package, Loader2, ArrowRight } from 'lucide-react';

export default function SearchResults({
  results = [],
  trackedUrls = new Set(),
  trackedProductsByUrl = {},
  onTrackProduct,
  onOpenTrackedProduct,
  trackingUrl = null,
  query = ''
}) {
  if (!query && results.length === 0) {
    return null;
  }

  if (results.length === 0) {
    return (
      <div className="mt-5 p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800">
        <Package className="h-10 w-10 mx-auto text-slate-500 mb-2 opacity-50" />
        <p className="text-sm font-medium text-slate-300">No products found matching &ldquo;{query}&rdquo;</p>
        <p className="text-xs text-slate-500 mt-1">Try searching by partial name, brand, or SKU</p>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-2">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-bold tracking-wider uppercase text-slate-400">
            Catalog Search Results
          </h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 font-mono font-medium">
            {results.length} found
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[440px] overflow-y-auto pr-1">
        {results.map((product) => {
          const isTracked = trackedUrls.has(product.product_url);
          const isCurrentlyTracking = trackingUrl === product.product_url;
          const trackedProduct = trackedProductsByUrl[product.product_url];

          return (
            <div
              key={product.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isTracked
                  ? 'bg-slate-900/90 border-teal-500/30 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700/60">
                        {product.category || 'Product'}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40">
                        {product.sku}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white mt-1.5 line-clamp-1" title={product.name}>
                      {product.name}
                    </h3>
                  </div>

                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-teal-400 transition-colors p-1"
                    title="View on INE Storefront"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {product.description || `Brand: ${product.brand} · SKU: ${product.sku}`}
                </p>

                <div className="flex items-center space-x-2 mt-2.5 text-[11px] text-slate-500">
                  <span>Brand: <strong className="text-slate-300 font-medium">{product.brand}</strong></span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-500">
                  ID: #{product.id}
                </span>

                {isTracked ? (
                  <button
                    type="button"
                    onClick={() => onOpenTrackedProduct && trackedProduct && onOpenTrackedProduct(trackedProduct)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all"
                    title="Open tracked product details"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Tracking Active</span>
                    <ArrowRight className="h-3 w-3 text-emerald-400" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onTrackProduct(product)}
                    disabled={isCurrentlyTracking}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-all"
                  >
                    {isCurrentlyTracking ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Tracking & Scraped...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Track Product</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

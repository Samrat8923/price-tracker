import React, { useState, useRef, useEffect } from 'react';
import StockBadge from './StockBadge';
import ScrapeStatusBadge from './ScrapeStatusBadge';
import {
  MoreVertical,
  History,
  FileText,
  ExternalLink,
  Trash2,
  Clock,
  Eye,
  RefreshCw
} from 'lucide-react';

export default function TrackedProductCard({
  product,
  onSelectProduct,
  onScrapeNow,
  onDeleteProduct,
  isScraping = false
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const hasPrice = product.current_price !== null && product.current_price !== undefined;
  const sku = product.sku || `INE-${product.id?.slice(0, 5) || 'ITEM'}`;

  const formatScrapeTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const exactScrapeTime = product.last_scraped_at
    ? new Date(product.last_scraped_at).toLocaleString('en-IN')
    : 'Never';

  return (
    <div
      onClick={() => onSelectProduct(product, 'chart')}
      className="bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 transition-colors flex flex-col justify-between cursor-pointer"
    >
      <div>
        {/* Header: Tracking Status, SKU & More Menu */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Tracking Active
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              SKU: {sku}
            </span>
          </div>

          <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-7 z-20 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 text-xs text-slate-200">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSelectProduct(product, 'chart');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center space-x-2 text-slate-300 hover:text-white"
                >
                  <Eye className="h-3.5 w-3.5 text-teal-400" />
                  <span>View Details</span>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSelectProduct(product, 'history');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center space-x-2 text-slate-300 hover:text-white"
                >
                  <History className="h-3.5 w-3.5 text-indigo-400" />
                  <span>View History</span>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSelectProduct(product, 'logs');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center space-x-2 text-slate-300 hover:text-white"
                >
                  <FileText className="h-3.5 w-3.5 text-amber-400" />
                  <span>View Scrape Logs</span>
                </button>

                <a
                  href={product.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center space-x-2 text-slate-300 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  <span>Open Storefront</span>
                </a>

                <div className="border-t border-slate-800 my-1"></div>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteProduct(product.id, product.product_name);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-rose-950/40 flex items-center space-x-2 text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Stop Tracking</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Product Name */}
        <h3
          className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors line-clamp-1"
          title={product.product_name}
        >
          {product.product_name}
        </h3>

        {/* Price & Stock Section */}
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold text-white tracking-tight">
            {hasPrice ? (
              `₹${Number(product.current_price).toLocaleString('en-IN')}`
            ) : (
              <span className="text-xs font-normal text-slate-500 italic">No price</span>
            )}
          </span>

          <StockBadge stock={product.current_stock} />
        </div>

        {/* Last Scraped & Status */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]" title={`Last Scraped: ${exactScrapeTime} (${product.latest_trigger_type || 'MANUAL'})`}>
            <Clock className="h-3 w-3 text-slate-500 shrink-0" />
            <span>{formatScrapeTime(product.last_scraped_at)}</span>
            <span className={`text-[9px] font-semibold uppercase px-1 py-0.2 rounded border ${
              product.latest_trigger_type === 'AUTOMATIC'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {product.latest_trigger_type === 'AUTOMATIC' ? 'AUTO' : 'MANUAL'}
            </span>
          </div>

          <ScrapeStatusBadge
            status={product.last_scrape_status}
            attemptNumber={product.latest_attempt_number || 1}
            isScraping={isScraping}
          />
        </div>

        {/* Automatic Scraping Schedule Status */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            <span>Auto (2h):</span>
          </span>
          {product.last_automatic_scrape_at ? (
            <span className="font-mono text-[10px] text-slate-300" title={`Last run: ${new Date(product.last_automatic_scrape_at).toLocaleString('en-IN')}`}>
              Last: {formatScrapeTime(product.last_automatic_scrape_at)} · Next (est.): {new Date(product.next_automatic_scrape_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 italic">
              Awaiting automatic run
            </span>
          )}
        </div>
      </div>

      {/* Direct Card Actions Footer */}
      <div className="mt-4 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onSelectProduct(product, 'chart')}
          className="text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          View Details
        </button>

        <button
          onClick={() => onScrapeNow(product.id)}
          disabled={isScraping}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white font-medium text-xs transition-all"
        >
          <RefreshCw className={`h-3 w-3 ${isScraping ? 'animate-spin' : ''}`} />
          <span>{isScraping ? 'Scraping...' : 'Scrape Now (Manual)'}</span>
        </button>
      </div>
    </div>
  );
}

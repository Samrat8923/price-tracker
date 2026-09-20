import React from 'react';
import { Layers, PackageCheck, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function TopMetrics({ products = [] }) {
  const total = products.length;

  // In-stock active products
  const inStock = products.filter(
    p => p.current_stock && !p.current_stock.toLowerCase().includes('out of stock')
  ).length;

  const inStockPct = total > 0 ? Math.round((inStock / total) * 100) : 0;

  // Scraper Health calculation
  const productsWithScrapes = products.filter(p => p.last_scrape_status !== null);
  const successfulScrapes = products.filter(p => p.last_scrape_status === 'SUCCESS').length;
  const issuesCount = products.filter(p => p.last_scrape_status === 'FAILURE').length;

  const healthPct = productsWithScrapes.length > 0
    ? Math.round((successfulScrapes / productsWithScrapes.length) * 100)
    : 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
      {/* 1. Total Tracked */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center space-x-3.5">
        <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-medium text-slate-400 block truncate">Total Tracked</span>
          <div className="text-xl font-bold text-white tracking-tight">{total}</div>
        </div>
      </div>

      {/* 2. In-Stock Inventory */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center space-x-3.5">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <PackageCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-medium text-slate-400 block truncate">In-Stock Items</span>
          <div className="text-xl font-bold text-white tracking-tight">
            {inStock} <span className="text-xs font-normal text-slate-500">({inStockPct}%)</span>
          </div>
        </div>
      </div>

      {/* 3. Scraper Reliability */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center space-x-3.5">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
          issuesCount > 0
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {issuesCount > 0 ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-medium text-slate-400 block truncate">Scraper Health</span>
          <div className="text-xl font-bold text-white tracking-tight">
            {healthPct}% <span className="text-[10px] font-normal text-slate-500">{issuesCount > 0 ? `${issuesCount} issues` : 'Optimal'}</span>
          </div>
        </div>
      </div>

      {/* 4. External Cron Schedule */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center space-x-3.5">
        <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
          <Clock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-medium text-slate-400 block truncate">External Cron</span>
          <div className="text-sm font-semibold text-white tracking-tight mt-0.5">Every 2 Hours</div>
          <span className="text-[10px] text-slate-500">cron-job.org</span>
        </div>
      </div>
    </div>
  );
}

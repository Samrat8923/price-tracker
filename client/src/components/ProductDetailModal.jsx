import React, { useState, useEffect } from 'react';
import StockBadge from './StockBadge';
import ScrapeStatusBadge from './ScrapeStatusBadge';
import PriceChart from './PriceChart';
import ScrapeLogsTable from './ScrapeLogsTable';
import {
  X,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Clock,
  History,
  FileText,
  AlertCircle,
  Package,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api';

export default function ProductDetailModal({
  product,
  initialTab = 'chart',
  onClose,
  onScrapeNow,
  isScraping = false
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'chart');
  const [details, setDetails] = useState(product);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync initialTab if changed from outside
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const fetchLatestDetails = async () => {
    if (!product?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getTrackedProductById(product.id);
      setDetails(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestDetails();
  }, [product?.id]);

  if (!product) return null;

  const currentPrice = details?.current_price ?? product.current_price;
  const previousPrice = details?.previous_price ?? product.previous_price;
  const currentStock = details?.current_stock ?? product.current_stock;
  const lastScrapeStatus = details?.last_scrape_status ?? product.last_scrape_status;
  const latestAttempt = details?.latest_attempt_number ?? product.latest_attempt_number ?? 1;
  const latestTriggerType = details?.latest_trigger_type || product.latest_trigger_type || (details?.logs?.[0]?.trigger_type) || 'MANUAL';
  const sku = details?.sku || product.sku || `INE-${product.id?.slice(0, 5) || 'ITEM'}`;
  const history = details?.history || [];
  const logs = details?.logs || [];

  const exactScrapeTime = (details?.last_scraped_at || product.last_scraped_at)
    ? new Date(details?.last_scraped_at || product.last_scraped_at).toLocaleString('en-IN')
    : 'Never scraped';

  // Has recovered after retry
  const isRecovered = lastScrapeStatus === 'SUCCESS' && latestAttempt > 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-150">
      <div className="relative w-[94vw] max-w-[1400px] h-[90vh] max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Tracking Active</span>
              </span>

              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                SKU: {sku}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate" title={details?.product_name || product.product_name}>
              {details?.product_name || product.product_name}
            </h2>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open Storefront</span>
            </a>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Top Product Meta & Scrape Action Banner */}
        <div className="p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800/80 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Current Price */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Current Price
              </span>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {currentPrice !== null ? (
                  <span>₹{Number(currentPrice).toLocaleString('en-IN')}</span>
                ) : (
                  <span className="text-xs font-normal text-slate-500 italic">No price data</span>
                )}
              </div>
            </div>

            {/* 2. Stock Status */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Stock Availability
              </span>
              <div className="mt-1">
                <StockBadge stock={currentStock} />
              </div>
            </div>

            {/* 3. Scrape Status & Timestamp */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Latest Scrape
                </span>
                <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                  latestTriggerType === 'AUTOMATIC'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {latestTriggerType === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL'}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <ScrapeStatusBadge
                  status={lastScrapeStatus}
                  attemptNumber={latestAttempt}
                  isScraping={isScraping}
                />
                <span className="text-[11px] text-slate-500 truncate" title={exactScrapeTime}>
                  {exactScrapeTime}
                </span>
              </div>
            </div>

            {/* 4. Run Scrape Now Action */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Direct Action
              </span>
              <button
                onClick={async () => {
                  await onScrapeNow(product.id);
                  await fetchLatestDetails();
                }}
                disabled={isScraping}
                className="w-full mt-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white font-medium text-xs shadow transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                <span>{isScraping ? 'Scraping Store...' : 'Scrape Now (Manual)'}</span>
              </button>
            </div>
          </div>

          {/* Recovery Notification if scraped after retry */}
          {isRecovered && (
            <div className="mt-3 p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/25 flex items-center space-x-2 text-xs text-teal-300">
              <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0" />
              <span>
                <strong>Resilience Audit:</strong> Initial attempt encountered storefront latency; automated retry recovered cleanly on Attempt #{latestAttempt}.
              </span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 sm:px-6 pt-3 border-b border-slate-800 bg-slate-900 flex items-center space-x-6 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('chart')}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'chart'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Price Trend Chart</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Price & Stock History ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Scrape Audit Logs ({logs.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Chart */}
          {activeTab === 'chart' && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-slate-300">
                  Recorded Price Points Over Time
                </span>
                <span className="text-[11px] text-slate-500">
                  {history.length} valid checkpoints recorded
                </span>
              </div>
              <PriceChart history={history} />
            </div>
          )}

          {/* TAB 2: History Table */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-2.5 text-xs text-slate-400">
                <span>Verified Historical Snapshots</span>
                <span>{history.length} records</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 font-semibold">#</th>
                      <th className="py-2.5 px-3 font-semibold">Recorded Price</th>
                      <th className="py-2.5 px-3 font-semibold">Stock Status</th>
                      <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                          No price history recorded yet. Click &ldquo;Run Scrape Now&rdquo; to record baseline data.
                        </td>
                      </tr>
                    ) : (
                      history.map((record, idx) => {
                        return (
                          <tr key={record.id || idx} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-white">
                              ₹{Number(record.price).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3">
                              <StockBadge stock={record.stock_status} />
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {new Date(record.scraped_at).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Audit Logs */}
          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-2.5 text-xs text-slate-400">
                <span>Playwright Scrape Execution Audit Trail</span>
                <span>{logs.length} logged attempts</span>
              </div>
              <ScrapeLogsTable logs={logs} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end text-xs text-slate-400 shrink-0 z-10">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

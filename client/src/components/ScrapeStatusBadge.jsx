import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock } from 'lucide-react';

export default function ScrapeStatusBadge({ status, attemptNumber = 1, isScraping = false, size = 'md' }) {
  if (isScraping) {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
        <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
        <span>Scraping Store...</span>
      </span>
    );
  }

  if (!status) {
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
        <Clock className="h-3 w-3 text-slate-500" />
        <span>Pending Initial Scrape</span>
      </span>
    );
  }

  const isSuccess = status === 'SUCCESS';
  const isRecovered = isSuccess && attemptNumber > 1;

  if (isRecovered) {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300 border border-teal-500/30" title={`Succeeded on retry attempt ${attemptNumber}`}>
        <RefreshCw className="h-3 w-3 text-teal-400" />
        <span>Recovered (Attempt {attemptNumber})</span>
      </span>
    );
  }

  if (isSuccess) {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        <span>Successful</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
      <XCircle className="h-3 w-3 text-rose-400" />
      <span>Scrape Failed</span>
    </span>
  );
}

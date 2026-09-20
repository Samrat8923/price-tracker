import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

export default function StockBadge({ stock }) {
  if (!stock) {
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
        <HelpCircle className="h-3 w-3" />
        <span>Pending Scrape</span>
      </span>
    );
  }

  const isOutOfStock = stock.toLowerCase().includes('out of stock');

  if (isOutOfStock) {
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <AlertCircle className="h-3 w-3" />
        <span>Out of Stock</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="h-3 w-3" />
      <span>{stock}</span>
    </span>
  );
}

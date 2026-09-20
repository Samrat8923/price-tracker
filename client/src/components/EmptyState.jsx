import React from 'react';
import { Search, Compass, ShieldCheck, ArrowRight } from 'lucide-react';

export default function EmptyState({ onBrowseClick }) {
  return (
    <div className="mt-6 p-12 text-center rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800/90 shadow-xl max-w-2xl mx-auto">
      <div className="h-16 w-16 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 shadow-inner">
        <Compass className="h-8 w-8" />
      </div>

      <h3 className="text-xl font-bold text-white tracking-tight">
        No Products Currently Tracked
      </h3>

      <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
        Search products in the catalog above to add them to your tracking pipeline.
      </p>

      <div className="mt-6 flex items-center justify-center">
        <button
          onClick={onBrowseClick}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-medium text-xs shadow-lg shadow-teal-600/20 transition-all cursor-pointer"
        >
          <Search className="h-4 w-4" />
          <span>Search Storefront Products</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

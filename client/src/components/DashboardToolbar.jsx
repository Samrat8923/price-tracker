import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';

export default function DashboardToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  counts = { all: 0, inStock: 0, outOfStock: 0, issues: 0 }
}) {
  const filterTabs = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'in_stock', label: 'In Stock', count: counts.inStock },
    { id: 'out_of_stock', label: 'Out of Stock', count: counts.outOfStock },
    { id: 'issues', label: 'Scrape Issues', count: counts.issues, highlight: counts.issues > 0 }
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 mb-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Search Input for Tracked Products */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter tracked products by name or SKU..."
          className="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs and Sort Controls */}
      <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
        {/* Filter Chips */}
        <div className="flex items-center space-x-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFilterChange(tab.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-teal-700 text-white'
                      : tab.highlight
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center space-x-1.5 bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 text-[11px] hidden sm:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer pr-1"
          >
            <option value="recent" className="bg-slate-900 text-slate-200">Recently Scraped</option>
            <option value="price_asc" className="bg-slate-900 text-slate-200">Price: Low to High</option>
            <option value="price_desc" className="bg-slate-900 text-slate-200">Price: High to Low</option>
            <option value="name" className="bg-slate-900 text-slate-200">Product Name</option>
          </select>
        </div>
      </div>
    </div>
  );
}

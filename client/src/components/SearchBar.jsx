import React, { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export default function SearchBar({ onSearch, isSearching = false }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleQuickTag = (tag) => {
    setQuery(tag);
    onSearch(tag);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search INE storefront by partial or full product name (e.g., 'Headphones', 'Soundbar', 'Monitor')..."
            className="w-full pl-11 pr-24 py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm shadow-inner transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-20 pr-2 flex items-center text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="absolute right-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 text-white font-medium text-xs shadow-md transition-all flex items-center space-x-1.5"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <span>Search</span>
          )}
        </button>
      </form>

      {/* Suggested Quick Filters */}
      <div className="flex items-center space-x-2 mt-2.5 text-xs text-slate-400 overflow-x-auto pb-1">
        <span className="text-slate-500 font-medium">Quick suggestions:</span>
        {['Headphones', 'Soundbar', 'Monitor', 'Grinder', 'Watch', 'Turntable'].map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => handleQuickTag(tag)}
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Home page - Modern Politician Directory
 * Clean, beautiful design with search, filters, and pagination
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listPoliticians, ListPoliticiansResult } from '../lib/pb';
import { usePoliticianFilters, US_STATES, OFFICE_OPTIONS, PARTY_OPTIONS, SORT_OPTIONS } from '../hooks/usePoliticianFilters';
import { Politician } from '../types/politician';
import { pb } from '../lib/pocketbase';

function Home() {
  const {
    filters,
    pbFilter,
    updateSearchText,
    updateState,
    updateOffice,
    updateParty,
    updateHasPhoto,
    updateSort,
    updatePage,
    resetFilters,
  } = usePoliticianFilters();

  const [result, setResult] = useState<ListPoliticiansResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Fetch politicians
  useEffect(() => {
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setError(null);

    listPoliticians({
      page: filters.page,
      perPage: filters.perPage,
      filter: pbFilter && pbFilter.trim() ? pbFilter : undefined,
      sort: filters.sort,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to load politicians');
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [filters.page, filters.perPage, pbFilter, filters.sort]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchText !== '' ||
      filters.selectedState !== 'all' ||
      filters.selectedOffice !== 'all' ||
      filters.selectedParty !== 'all' ||
      filters.hasPhoto
    );
  }, [filters]);

  const getPhotoUrl = (politician: Politician): string => {
    if (politician.photo) {
      return pb.files.getURL(politician, politician.photo);
    }
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Ccircle fill="%23f3f4f6" cx="40" cy="40" r="40"/%3E%3Ctext fill="%23d1d5db" font-family="system-ui, sans-serif" font-size="12" font-weight="500" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Photo%3C/text%3E%3C/svg%3E';
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Politician Directory</h1>
              <p className="text-gray-600 text-sm">
                Search and explore U.S. Senators, Representatives, and Governors
              </p>
            </div>
            {result && (
              <div className="hidden md:block text-right">
                <div className="text-2xl font-bold text-gray-900">{result.totalItems.toLocaleString()}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Total Politicians</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 sticky top-[120px] z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  value={filters.searchText}
                  onChange={(e) => updateSearchText(e.target.value)}
                  placeholder="Name or position..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                State
              </label>
              <select
                id="state"
                value={filters.selectedState}
                onChange={(e) => updateState(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              >
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Office */}
            <div>
              <label htmlFor="office" className="block text-sm font-semibold text-gray-700 mb-2">
                Office
              </label>
              <select
                id="office"
                value={filters.selectedOffice}
                onChange={(e) => updateOffice(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              >
                {OFFICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Party */}
            <div>
              <label htmlFor="party" className="block text-sm font-semibold text-gray-700 mb-2">
                Party
              </label>
              <select
                id="party"
                value={filters.selectedParty}
                onChange={(e) => updateParty(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
              >
                {PARTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasPhoto"
                checked={filters.hasPhoto}
                onChange={(e) => updateHasPhoto(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="hasPhoto" className="text-sm font-medium text-gray-700 cursor-pointer">
                Has Photo
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                Sort:
              </label>
              <select
                id="sort"
                value={filters.sort}
                onChange={(e) => updateSort(e.target.value as any)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear All
              </button>
            )}

            {result && (
              <div className="ml-auto text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{result.items.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{result.totalItems.toLocaleString()}</span> results
                {result.totalPages > 1 && (
                  <span className="text-gray-500"> • Page {result.page} of {result.totalPages}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && !result && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {[...Array(20)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-5 animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-800 font-semibold mb-2">Error loading politicians</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && result && result.items.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="text-6xl mb-4 opacity-50">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No politicians found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results.'
                : 'No politicians are available at this time.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Results Grid - Matching PoliticiansDirectory style */}
        {!loading && !error && result && result.items.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mb-8" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {result.items.map((politician) => (
                <Link
                  key={politician.id}
                  to={`/politicians/${politician.slug}`}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col items-center text-center"
                >
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-4 overflow-hidden relative flex-shrink-0">
                    {politician.photo ? (
                      <img
                        src={getPhotoUrl(politician)}
                        alt={politician.name}
                        className="absolute inset-0 w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Name */}
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">
                    {politician.name}
                  </h3>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => updatePage(result.page - 1)}
                  disabled={result.page === 1}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-gray-700"
                >
                  ← Previous
                </button>
                <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-700">
                  Page {result.page} of {result.totalPages}
                </div>
                <button
                  onClick={() => updatePage(result.page + 1)}
                  disabled={result.page >= result.totalPages}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-gray-700"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Home;

/**
 * Home page - Politician Directory with search, filters, and pagination
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
    // Cancel previous request
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
      filter: pbFilter || undefined,
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
          return; // Request was cancelled, ignore
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

  // Check if any filters are active
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
      return pb.files.getUrl(politician, politician.photo);
    }
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Photo%3C/text%3E%3C/svg%3E';
  };

  const getOfficeLabel = (officeType: string | null | undefined): string => {
    switch (officeType) {
      case 'senator':
        return 'U.S. Senator';
      case 'representative':
        return 'U.S. Representative';
      case 'governor':
        return 'Governor';
      default:
        return 'Politician';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Politician Directory</h1>
          <p className="text-gray-600">
            Search and filter U.S. Senators, Representatives, and Governors
          </p>
        </div>

        {/* Filter Bar - Sticky on desktop */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 sticky top-4 z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                id="search"
                type="text"
                value={filters.searchText}
                onChange={(e) => updateSearchText(e.target.value)}
                placeholder="Search by name or position..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                id="state"
                value={filters.selectedState}
                onChange={(e) => updateState(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label htmlFor="office" className="block text-sm font-medium text-gray-700 mb-1">
                Office
              </label>
              <select
                id="office"
                value={filters.selectedOffice}
                onChange={(e) => updateOffice(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label htmlFor="party" className="block text-sm font-medium text-gray-700 mb-1">
                Party
              </label>
              <select
                id="party"
                value={filters.selectedParty}
                onChange={(e) => updateParty(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PARTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Has Photo Toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasPhoto}
                  onChange={(e) => updateHasPhoto(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Has Photo</span>
              </label>
            </div>
          </div>

          {/* Sort and Clear */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                Sort:
              </label>
              <select
                id="sort"
                value={filters.sort}
                onChange={(e) => updateSort(e.target.value as any)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                Clear Filters
              </button>
            )}

            {result && (
              <div className="ml-auto text-sm text-gray-600">
                Showing {result.items.length} of {result.totalItems} results
                {result.totalPages > 1 && ` (Page ${result.page} of ${result.totalPages})`}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {loading && !result && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium mb-2">Error loading politicians</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && result && result.items.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No politicians found</h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results.'
                : 'No politicians are available at this time.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && result && result.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
              {result.items.map((politician) => (
                <Link
                  key={politician.id}
                  to={`/politicians/${politician.slug}`}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-100 block group"
                >
                  {/* Photo Section - Centered */}
                  <div className="flex justify-center pt-5 pb-3">
                    <div className="relative">
                      <img
                        src={getPhotoUrl(politician)}
                        alt={politician.name}
                        className="w-14 h-14 object-cover rounded-full border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                        style={{ width: '56px', height: '56px' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="56" height="56"%3E%3Ccircle fill="%23e5e7eb" cx="28" cy="28" r="28"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="10" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Photo%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="px-4 pb-4">
                    <h3 className="font-semibold text-gray-900 mb-1 text-center line-clamp-2 group-hover:text-blue-600 transition-colors text-sm">
                      {politician.name}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2.5 text-center">
                      {politician.current_position || getOfficeLabel(politician.office_type)}
                    </p>
                    <div className="flex flex-wrap justify-center gap-1 mb-3">
                      {politician.state && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {politician.state}
                        </span>
                      )}
                      {politician.political_party && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {politician.political_party}
                        </span>
                      )}
                      {politician.district && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          D-{politician.district}
                        </span>
                      )}
                    </div>

                    {/* Quick Links Row - Centered */}
                    {(politician.wikipedia_url || politician.website_url || politician.x_url || politician.facebook_url) && (
                      <div className="flex items-center justify-center gap-3 pt-3 border-t border-gray-100">
                        {politician.wikipedia_url && (
                          <a
                            href={politician.wikipedia_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                            title="Wikipedia"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm1.25 17.292c-.646.646-1.417.958-2.25.958s-1.604-.312-2.25-.958c-.646-.646-.958-1.417-.958-2.25s.312-1.604.958-2.25c.646-.646 1.417-.958 2.25-.958s1.604.312 2.25.958c.646.646.958 1.417.958 2.25s-.312 1.604-.958 2.25zm-1.25-4.292c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1zm-2-1c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1zm4 0c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1z"/>
                            </svg>
                          </a>
                        )}
                        {politician.website_url && (
                          <a
                            href={politician.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                            title="Website"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          </a>
                        )}
                        {politician.x_url && (
                          <a
                            href={politician.x_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                            title="X (Twitter)"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          </a>
                        )}
                        {politician.facebook_url && (
                          <a
                            href={politician.facebook_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                            title="Facebook"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => updatePage(result.page - 1)}
                  disabled={result.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {result.page} of {result.totalPages}
                </span>
                <button
                  onClick={() => updatePage(result.page + 1)}
                  disabled={result.page >= result.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Home;

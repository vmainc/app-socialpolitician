/**
 * Home page - Modern Politician Directory
 * Clean, beautiful design with search, filters, and pagination
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listPoliticians, ListPoliticiansResult, getPoliticianRoute } from '../lib/pb';
import { usePoliticianFilters, US_STATES, OFFICE_OPTIONS, PARTY_OPTIONS, SORT_OPTIONS } from '../hooks/usePoliticianFilters';
import { Politician } from '../types/politician';
import { pb } from '../lib/pocketbase';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import './Home.css';

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


  function AvatarPlaceholder() {
    return (
      <span className="home-politician-card-avatar-placeholder" aria-hidden>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </span>
    );
  }

  return (
    <div className="home-page">
      {/* Header - Matching PoliticiansDirectory style */}
      <header className="page-header">
        <h1 className="page-title">Politician Directory</h1>
        <p className="page-subtitle">
          {result ? `${result.totalItems.toLocaleString()} Total Politicians` : 'Search and explore U.S. Senators, Representatives, and Governors'}
        </p>
      </header>

      {/* Filter Bar */}
      <div className="home-filters">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {/* Search */}
          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="search" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Search
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="search"
                type="text"
                value={filters.searchText}
                onChange={(e) => updateSearchText(e.target.value)}
                placeholder="Name or position..."
                style={{ width: '100%', padding: '0.625rem 2.5rem 0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
              />
              <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* State */}
          <div>
            <label htmlFor="state" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              State
            </label>
            <select
              id="state"
              value={filters.selectedState}
              onChange={(e) => updateState(e.target.value)}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff' }}
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
            <label htmlFor="office" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Office
            </label>
            <select
              id="office"
              value={filters.selectedOffice}
              onChange={(e) => updateOffice(e.target.value as any)}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff' }}
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
            <label htmlFor="party" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Party
            </label>
            <select
              id="party"
              value={filters.selectedParty}
              onChange={(e) => updateParty(e.target.value as any)}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff' }}
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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="hasPhoto"
              checked={filters.hasPhoto}
              onChange={(e) => updateHasPhoto(e.target.checked)}
              style={{ width: '1rem', height: '1rem' }}
            />
            <label htmlFor="hasPhoto" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              Has Photo
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="sort" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              Sort:
            </label>
            <select
              id="sort"
              value={filters.sort}
              onChange={(e) => updateSort(e.target.value as any)}
              style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff' }}
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
              style={{ padding: '0.375rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '0.5rem' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Clear All
            </button>
          )}

          {result && (
            <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#4b5563' }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>{result.items.length}</span> of{' '}
              <span style={{ fontWeight: 600, color: '#111827' }}>{result.totalItems.toLocaleString()}</span> results
              {result.totalPages > 1 && (
                <span style={{ color: '#6b7280' }}> • Page {result.page} of {result.totalPages}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && !result && (
        <div className="home-loading">Loading...</div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem', textAlign: 'center', paddingTop: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.125rem' }}>Error loading politicians</p>
          <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.625rem 1.5rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && result && result.items.length === 0 && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem', textAlign: 'center', paddingTop: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>🔍</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>No politicians found</h3>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem', maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results.'
              : 'No politicians are available at this time.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              style={{ padding: '0.625rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Results Grid - Matching PoliticiansDirectory style exactly */}
      {!loading && !error && result && result.items.length > 0 && (
        <>
          <div className="home-card-grid">
            {result.items.map((politician) => (
              <Link
                key={politician.id}
                to={getPoliticianRoute(politician)}
                className="home-politician-card"
              >
                <div className="home-politician-card-avatar">
                  <AvatarPlaceholder />
                  {politician.photo && (
                    <img
                      src={getPhotoUrl(politician)}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <h3 className="home-politician-card-name">{decodeHtmlEntities(politician.name)}</h3>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div style={{ maxWidth: '1280px', margin: '2rem auto 0', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <button
                onClick={() => updatePage(result.page - 1)}
                disabled={result.page === 1}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  background: result.page === 1 ? '#f3f4f6' : '#fff',
                  color: '#374151',
                  fontWeight: 500,
                  cursor: result.page === 1 ? 'not-allowed' : 'pointer',
                  opacity: result.page === 1 ? 0.5 : 1,
                }}
              >
                ← Previous
              </button>
              <div style={{ padding: '0.625rem 1rem', background: '#f9fafb', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                Page {result.page} of {result.totalPages}
              </div>
              <button
                onClick={() => updatePage(result.page + 1)}
                disabled={result.page >= result.totalPages}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  background: result.page >= result.totalPages ? '#f3f4f6' : '#fff',
                  color: '#374151',
                  fontWeight: 500,
                  cursor: result.page >= result.totalPages ? 'not-allowed' : 'pointer',
                  opacity: result.page >= result.totalPages ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;

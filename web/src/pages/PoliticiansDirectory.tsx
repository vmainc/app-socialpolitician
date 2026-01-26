/**
 * Directory page for Senators, Representatives, or Governors
 * Simple card layout: profile placeholder, Name, Position, State, Start of Term
 */

import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician } from '../types/politician';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import { isMediaEntry, isPresident, isPreviousRepresentative, buildOfficeFilter } from '../lib/pb';
import './PoliticiansDirectory.css';

function AvatarPlaceholder() {
  return (
    <span className="politician-card-avatar-placeholder" aria-hidden>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </span>
  );
}


function PoliticiansDirectory() {
  const location = useLocation();
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true);

  const pathType = location.pathname.split('/')[1];
  const officeType: 'senator' | 'representative' | 'governor' | null =
    pathType === 'senators'
      ? 'senator'
      : pathType === 'representatives'
        ? 'representative'
        : pathType === 'governors'
          ? 'governor'
          : null;

  useEffect(() => {
    if (!officeType) {
      setLoading(false);
      return;
    }

    async function loadPoliticians() {
      try {
        console.log(`🔍 Loading ${officeType}s...`);
        console.log(`📡 PocketBase base URL: ${pb.baseUrl}`);
        console.log(`📦 Collection: politicians`);
        
        // Build safe filter using helper function
        // Prefers chamber/status enum fields, falls back to office_type/current_position
        if (!officeType) {
          throw new Error('Invalid office type');
        }
        const filter = buildOfficeFilter(officeType);
        
        console.log(`🔍 PB filter: ${filter}`);
        console.log(`🔗 Full query URL: ${pb.baseUrl}/api/collections/politicians/records?filter=${encodeURIComponent(filter)}`);
        
        // Runtime assertion: prevent !~ usage
        if (filter.includes('!~')) {
          throw new Error(
            `❌ FORBIDDEN: Filter contains !~ operator. Use pbNotContains() helper instead.`
          );
        }
        
        const records = await pb.collection('politicians').getFullList<Politician>({
          filter: filter,
          sort: 'name',
        });
        
        console.log(`✅ PocketBase response: ${records.length} records`);
        
        // Additional client-side filtering for safety
        // (The PocketBase filter should already handle most exclusions)
        const filteredRecords = records.filter(p => {
          // Double-check status field (should already be filtered by buildOfficeFilter)
          const status = (p.status || '').toLowerCase();
          if (status === 'former' || status === 'retired') {
            return false;
          }
          // Filter out media entries, presidents, and previous representatives
          return !isMediaEntry(p) && 
                 !isPresident(p) && 
                 !isPreviousRepresentative(p);
        });
        
        const filteredCount = records.length - filteredRecords.length;
        console.log(`✅ Loaded ${filteredRecords.length} ${officeType}s (client-side filtered ${filteredCount} entries: media/presidents/former)`);
        setPoliticians(filteredRecords);
      } catch (error: any) {
        console.error('❌ Failed to load politicians:', error);
        console.error('   Error details:', {
          message: error?.message,
          status: error?.status,
          response: error?.response,
        });
      } finally {
        setLoading(false);
      }
    }

    loadPoliticians();
  }, [officeType]);

  const getTitle = () => {
    switch (officeType) {
      case 'senator':
        return 'U.S. Senators';
      case 'representative':
        return 'U.S. Representatives';
      case 'governor':
        return 'U.S. Governors';
      default:
        return 'Politicians';
    }
  };

  const getSubtitle = () => {
    const label =
      officeType === 'senator'
        ? 'Senators'
        : officeType === 'representative'
          ? 'Representatives'
          : 'Governors';
    return `${politicians.length} ${label}`;
  };

  if (loading) {
    return (
      <div className="politicians-page">
        <div className="politicians-loading">Loading...</div>
      </div>
    );
  }

  if (!officeType) {
    return (
      <div className="politicians-page">
        <div className="politicians-invalid">
          <h1>Invalid Page</h1>
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="politicians-page">
      <header className="page-header">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
        <h1 className="page-title">{getTitle()}</h1>
        <p className="page-subtitle">{getSubtitle()}</p>
      </header>

      {politicians.length === 0 ? (
        <div className="politicians-empty">No politicians found.</div>
      ) : (
        <div className="politicians-card-grid">
          {politicians.map((p) => (
            <Link
              key={p.id}
              to={`/politicians/${p.slug}`}
              className="politician-card"
            >
              <div className="politician-card-avatar">
                <AvatarPlaceholder />
                {p.photo && (
                  <img
                    src={`${pb.files.getURL(p, p.photo)}?t=${Date.now()}`}
                    alt=""
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <h3 className="politician-card-name">{decodeHtmlEntities(p.name)}</h3>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default PoliticiansDirectory;

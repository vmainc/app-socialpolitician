/**
 * Directory page for Senators, Representatives, or Governors
 * Simple card layout: profile placeholder, Name, Position, State, Start of Term
 */

import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician } from '../types/politician';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import { isMediaEntry, isPresident, isPreviousRepresentative } from '../lib/pb';
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
        // First, try without filter to see if ANY records are accessible
        const allRecords = await pb.collection('politicians').getList<Politician>(1, 5);
        console.log(`📊 Total accessible records (no filter): ${allRecords.totalItems}`);
        
        // Now try with filter
        // For senators, exclude "Previous/Former Senator" to show only current 100 senators
        // For representatives, also check current_position since office_type might not be set
        let filter = `office_type="${officeType}"`;
        if (officeType === 'senator') {
          // Exclude previous/former senators - only show current 100
          // Try multiple filter approaches - PocketBase filter syntax
          // Option 1: Exclude Previous/Former
          // Option 2: Only include those with "U.S. Senator" (current ones)
          filter = `office_type="${officeType}" && current_position~"U.S. Senator" && current_position!~"Previous" && current_position!~"Former"`;
        } else if (officeType === 'representative') {
          // Exclude previous/former representatives - only show current ones
          filter = `office_type="${officeType}" && current_position!~"Previous" && current_position!~"Former"`;
        }
        
        const records = await pb.collection('politicians').getFullList<Politician>({
          filter,
          sort: 'name',
        });
        
        // Filter out media entries, presidents, and previous representatives
        const filteredRecords = records.filter(p => 
          !isMediaEntry(p) && 
          !isPresident(p) && 
          !isPreviousRepresentative(p)
        );
        
        const filteredCount = records.length - filteredRecords.length;
        console.log(`✅ Loaded ${filteredRecords.length} ${officeType}s (filtered ${filteredCount} entries: media/presidents)`);
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

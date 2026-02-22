/**
 * Executive branch: President, Vice President, Cabinet
 * Same card layout and profile flow as Senators/Representatives/Governors.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician } from '../types/politician';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import { buildOfficeFilter, getPoliticianRoute } from '../lib/pb';
import './PoliticiansDirectory.css';
import './Executive.css';

function AvatarPlaceholder() {
  return (
    <span className="politician-card-avatar-placeholder" aria-hidden>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </span>
  );
}

type ExecutiveRole = 'president' | 'vice_president' | 'cabinet';

function getOfficeType(p: Politician): ExecutiveRole {
  const ot = (p.office_type || '').toLowerCase();
  if (ot === 'president') return 'president';
  if (ot === 'vice_president' || ot === 'vice president') return 'vice_president';
  return 'cabinet';
}

function Executive() {
  const [all, setAll] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const filter = buildOfficeFilter('executive');
        const records = await pb.collection('politicians').getFullList<Politician>({
          filter,
          sort: 'name',
        });
        setAll(records);
      } catch (e) {
        console.error('Failed to load executive branch:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { president, vicePresident, cabinet } = useMemo(() => {
    const president: Politician[] = [];
    const vicePresident: Politician[] = [];
    const cabinet: Politician[] = [];
    for (const p of all) {
      const role = getOfficeType(p);
      if (role === 'president') president.push(p);
      else if (role === 'vice_president') vicePresident.push(p);
      else cabinet.push(p);
    }
    return { president, vicePresident, cabinet };
  }, [all]);

  if (loading) {
    return (
      <div className="politicians-page">
        <div className="politicians-loading">Loading...</div>
      </div>
    );
  }

  const CardGrid = ({ list, title }: { list: Politician[]; title: string }) => (
    <>
      {list.length > 0 && (
        <section className="executive-section">
          <h2 className="executive-section-title">{title}</h2>
          <div className="politicians-card-grid">
            {list.map((p) => (
              <Link
                key={p.id}
                to={getPoliticianRoute(p)}
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
                {(p.current_position || p.office_title) && (
                  <p className="politician-card-position">
                    {decodeHtmlEntities((p.office_title || p.current_position) || '')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );

  return (
    <div className="politicians-page executive-page">
      <header className="page-header">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
        <h1 className="page-title">Executive Branch</h1>
        <p className="page-subtitle">
          President, Vice President, and Cabinet
        </p>
      </header>

      {all.length === 0 ? (
        <div className="politicians-empty">No executive officials found.</div>
      ) : (
        <>
          <div className="executive-top-row">
            <CardGrid list={president} title="President" />
            <CardGrid list={vicePresident} title="Vice President" />
          </div>
          <CardGrid list={cabinet} title="Cabinet" />
        </>
      )}
    </div>
  );
}

export default Executive;

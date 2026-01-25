/**
 * Politician Profile Page - Matching directory page style
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician, Feed } from '../types/politician';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import './PoliticianProfile.css';

function PoliticianProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [politician, setPolitician] = useState<Politician | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function loadProfile() {
      try {
        const politicianRecord = await pb
          .collection('politicians')
          .getFirstListItem<Politician>(`slug="${slug}"`, {});

        setPolitician(politicianRecord);

        try {
          const feedRecords = await pb.collection('feeds').getList<Feed>(1, 50, {
            filter: `politician="${politicianRecord.id}"`,
            sort: '-fetched_at',
          });
          
          const filteredFeeds = feedRecords.items.filter(feed => {
            if (!feed.source) return true;
            const source = feed.source.toLowerCase();
            const excludedSources = ['reddit', 'quora', 'medium.com', 'nextdoor'];
            return !excludedSources.some(excluded => source.includes(excluded));
          });
          
          setFeeds(filteredFeeds);
        } catch (feedError: any) {
          setFeeds([]);
        }
      } catch (error: any) {
        if (error?.status === 404) {
          console.error('Politician not found');
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [slug]);

  const getOfficeTypeLabel = (type: string | null | undefined) => {
    switch (type) {
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



  const getSocialLinks = () => {
    if (!politician) return [];
    const links: Array<{ label: string; url: string; icon: string; color: string }> = [];

    if (politician.website_url) {
      links.push({ label: 'Website', url: politician.website_url, icon: '🌐', color: 'text-blue-600' });
    }
    if (politician.wikipedia_url) {
      links.push({ label: 'Wikipedia', url: politician.wikipedia_url, icon: '📚', color: 'text-gray-700' });
    }
    if (politician.x_url) {
      links.push({ label: 'X', url: politician.x_url, icon: '𝕏', color: 'text-black' });
    }
    if (politician.facebook_url) {
      links.push({ label: 'Facebook', url: politician.facebook_url, icon: 'f', color: 'text-blue-600' });
    }
    if (politician.instagram_url) {
      links.push({ label: 'Instagram', url: politician.instagram_url, icon: '📷', color: 'text-pink-600' });
    }
    if (politician.youtube_url) {
      links.push({ label: 'YouTube', url: politician.youtube_url, icon: '▶', color: 'text-red-600' });
    }
    if (politician.truth_social_url) {
      links.push({ label: 'Truth Social', url: politician.truth_social_url, icon: '✓', color: 'text-purple-600' });
    }
    if (politician.tiktok_url) {
      links.push({ label: 'TikTok', url: politician.tiktok_url, icon: '♪', color: 'text-black' });
    }
    if (politician.linkedin_url) {
      links.push({ label: 'LinkedIn', url: politician.linkedin_url, icon: 'in', color: 'text-blue-700' });
    }

    return links;
  };

  function AvatarPlaceholder() {
    return (
      <span className="profile-avatar-placeholder" aria-hidden>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </span>
    );
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading...</div>
      </div>
    );
  }

  if (!politician) {
    return (
      <div className="profile-page">
        <div className="profile-not-found">
          <h1>Politician Not Found</h1>
          <p>The politician you're looking for doesn't exist.</p>
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const socialLinks = getSocialLinks();

  const getPartyClass = (party: string | null | undefined) => {
    if (!party) return '';
    const lower = party.toLowerCase();
    if (lower.includes('republican')) return 'party-republican';
    if (lower.includes('democrat')) return 'party-democrat';
    if (lower.includes('independent')) return 'party-independent';
    return '';
  };

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="profile-header">
        <Link to="/" className="back-link">
          <span>←</span>
          <span>Back</span>
        </Link>
      </header>

      <main className="profile-content">
        {/* Hero Section with Photo and Basic Info */}
        <div className="profile-hero">
          {/* Photo */}
          <div className="profile-avatar">
            <AvatarPlaceholder />
            {politician.photo && (
              <img
                src={`${pb.files.getURL(politician, politician.photo)}?t=${Date.now()}`}
                alt={politician.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>

          {/* Name & Info */}
          <div className="profile-info">
            <h1 className="profile-name">
              {decodeHtmlEntities(politician.name)}
            </h1>
            
            <p className="profile-office">
              {getOfficeTypeLabel(politician.office_type)}
            </p>

            {/* Badges */}
            <div className="profile-badges">
              {politician.state && (
                <span className="profile-badge">{politician.state}</span>
              )}
              {politician.political_party && (
                <span className={`profile-badge ${getPartyClass(politician.political_party)}`}>
                  {politician.political_party}
                </span>
              )}
              {politician.district && politician.office_type === 'representative' && (
                <span className="profile-badge">District {politician.district}</span>
              )}
            </div>

            {politician.current_position && (
              <p className="profile-position">
                "{politician.current_position}"
              </p>
            )}
          </div>
        </div>

        {/* Bio Section */}
        {politician.bio && politician.bio.trim().length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section-title">Biography</h2>
            <p className="profile-bio">
              {politician.bio}
            </p>
          </div>
        )}

        {/* Social Links Section */}
        {socialLinks.length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section-title">Connect & Learn More</h2>
            <div className="profile-social-links">
              {socialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-social-link"
                >
                  <span className="profile-social-icon">{link.icon}</span>
                  <div>
                    <div className="profile-social-label">{link.label}</div>
                    <div className="profile-social-subtext">Visit</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Feeds Section */}
        {feeds.length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section-title">Recent Activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {feeds.map((feed) => (
                <div 
                  key={feed.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div>
                    <p style={{ fontWeight: 600, color: '#111827', margin: 0, textTransform: 'capitalize' }}>
                      {feed.platform}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                      Updated {new Date(feed.fetched_at).toLocaleDateString()}
                    </p>
                  </div>
                  {Array.isArray(feed.normalized_items) && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}>
                      {feed.normalized_items.length} items
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No feeds message */}
        {feeds.length === 0 && (
          <div className="profile-section">
            <div className="profile-feeds-empty">
              <div className="profile-feeds-empty-icon">📱</div>
              <p className="profile-feeds-empty-text">Social media feeds will appear soon</p>
              <p className="profile-feeds-empty-subtext">We're working on aggregating their latest updates</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PoliticianProfile;

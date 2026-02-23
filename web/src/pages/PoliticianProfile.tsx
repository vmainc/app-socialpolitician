/**
 * Politician Profile Page - Matching directory page style
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician } from '../types/politician';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import SocialEmbeds from '../components/social/SocialEmbeds';
import ProfileComments from '../components/ProfileComments';
import ProfileAccordion from '../components/ProfileAccordion';
import ProfileNewsFeed from '../components/ProfileNewsFeed';
import './PoliticianProfile.css';

interface FavoriteRecord {
  id: string;
  user: string;
  politician: string;
}

function PoliticianProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [politician, setPolitician] = useState<Politician | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(pb.authStore.model as { id: string } | null);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const isExecutive =
    politician &&
    (() => {
      const officeType = politician.office_type?.toLowerCase();
      const chamber = politician.chamber?.toLowerCase();
      return (
        officeType === 'president' ||
        officeType === 'vice_president' ||
        officeType === 'cabinet' ||
        chamber === 'president' ||
        chamber === 'vice president' ||
        chamber === 'cabinet'
      );
    })();

  // Determine back link based on politician type
  const getBackLink = () => {
    if (politician) {
      const officeType = politician.office_type?.toLowerCase();
      const chamber = politician.chamber?.toLowerCase();
      if (officeType === 'governor' || chamber === 'governor') {
        return '/governors';
      } else if (officeType === 'senator' || chamber === 'senator') {
        return '/senators';
      } else if (officeType === 'representative' || chamber === 'representative') {
        return '/representatives';
      } else if (officeType === 'president' || officeType === 'vice_president' || officeType === 'cabinet' || chamber === 'president' || chamber === 'vice president' || chamber === 'cabinet') {
        return '/executive';
      }
    }

    return '/';
  };

  // Sync auth state
  useEffect(() => {
    setUser(pb.authStore.model as { id: string } | null);
    const unsub = pb.authStore.onChange(() => {
      setUser(pb.authStore.model as { id: string } | null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!slug) return;

    async function loadProfile() {
      try {
        const politicianRecord = await pb
          .collection('politicians')
          .getFirstListItem<Politician>(`slug="${slug}"`, {});

        setPolitician(politicianRecord);
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

  // Load favorite state when user + politician are set
  useEffect(() => {
    if (!user?.id || !politician?.id) {
      setFavoriteId(null);
      return;
    }
    let cancelled = false;
    pb.collection('user_favorites')
      .getList<FavoriteRecord>(1, 1, {
        filter: `user="${user.id}" && politician="${politician.id}"`,
      })
      .then((res) => {
        if (!cancelled && res.items.length > 0) setFavoriteId(res.items[0].id);
        else if (!cancelled) setFavoriteId(null);
      })
      .catch(() => {
        if (!cancelled) setFavoriteId(null);
      });
    return () => { cancelled = true; };
  }, [user?.id, politician?.id]);

  const handleAddFavorite = async () => {
    if (!user?.id || !politician?.id || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const rec = await pb.collection('user_favorites').create<FavoriteRecord>({
        user: user.id,
        politician: politician.id,
      });
      setFavoriteId(rec.id);
    } catch (_) {
      // e.g. duplicate
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleRemoveFavorite = async () => {
    if (!favoriteId || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      await pb.collection('user_favorites').delete(favoriteId);
      setFavoriteId(null);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const getOfficeLabel = () => {
    const type = (politician?.office_type ?? politician?.chamber)?.toString().toLowerCase();
    if (type === 'governor') return 'Governor';
    if (type === 'senator') return 'U.S. Senator';
    if (type === 'representative') return 'U.S. Representative';
    if (type === 'president') return 'President of the United States';
    if (type === 'vice_president' || type === 'vice president') return 'Vice President of the United States';
    if (type === 'cabinet') return politician?.office_title || politician?.current_position || 'Cabinet Member';
    return politician?.office_title || politician?.current_position || null;
  };

  const getSocialLinks = () => {
    if (!politician) return [];
    const links: Array<{ label: string; url: string; icon: string; color: string }> = [];

    // Order: social first, then Wikipedia, then website
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
    if (politician.wikipedia_url) {
      links.push({ label: 'Wikipedia', url: politician.wikipedia_url, icon: '📚', color: 'text-gray-700' });
    }
    const websiteUrl = politician.official_website_domain || politician.website_url;
    if (websiteUrl) {
      links.push({ label: 'Website', url: websiteUrl, icon: '🌐', color: 'text-blue-600' });
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

  // One line for everyone: "{name} has been serving as {position} for {state} since {date}." (executive: no state/date, "is serving as {position}.")
  const buildStructuredBio = (): string | null => {
    const name = politician?.name?.trim();
    if (!name) return null;
    const position =
      getOfficeLabel() ||
      (politician?.current_position || politician?.office_title)?.trim();
    if (!position) return null;

    if (isExecutive) {
      return `${name} is serving as ${position}.`;
    }

    const state = politician?.state?.trim();
    const raw = politician as unknown as Record<string, unknown>;
    const startDateRaw = (raw.position_start_date || raw.term_start_date) as string | undefined;
    const birthDateRaw = raw.birth_date as string | undefined;
    let sinceDate = '';
    if (startDateRaw && typeof startDateRaw === 'string') {
      const d = new Date(startDateRaw);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const currentYear = new Date().getFullYear();
        // Reject likely birth years: office start should be within plausible tenure (e.g. not 50+ years ago)
        const plausibleMinYear = currentYear - 50;
        const isSameAsBirth =
          birthDateRaw &&
          typeof birthDateRaw === 'string' &&
          new Date(birthDateRaw).getFullYear() === year;
        if (year >= plausibleMinYear && !isSameAsBirth) {
          sinceDate = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
      }
    }

    let line = `${name} has been serving as ${position}`;
    if (state) line += ` for ${state}`;
    if (sinceDate) line += ` since ${sinceDate}`;
    line += '.';
    return line;
  };

  const structuredBio = buildStructuredBio();

  // Strip Wikipedia-style citation markers [1], [2] so bios read cleanly.
  const stripCitationMarkers = (s: string) =>
    s.replace(/\s*\[\s*\d+\s*\]\s*/g, ' ').replace(/\s+/g, ' ').trim();

  // Cap long bios at ~500 words when using stored Wikipedia content.
  const BIO_DISPLAY_WORD_LIMIT = 500;
  const truncateToWordLimit = (text: string, limit: number) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= limit) return text;
    return words.slice(0, limit).join(' ') + ' …';
  };

  // Prefer short structured bio (like Abigail Spanberger) when we have the data; otherwise stored headline/bio.
  const raw = politician as unknown as Record<string, unknown>;
  const storedHeadline = stripCitationMarkers(((raw.headline ?? raw.bio) as string | undefined)?.trim() ?? '');
  const storedBioRaw = stripCitationMarkers((raw.bio as string | undefined)?.trim() ?? '');
  const storedBioCapped = truncateToWordLimit(storedBioRaw, BIO_DISPLAY_WORD_LIMIT);
  const headlineText = structuredBio ?? storedHeadline;
  const bioForAccordion = structuredBio ?? storedBioCapped;
  const showBiographyAccordion = bioForAccordion.length > 0;
  const bioParagraphs = bioForAccordion
    ? bioForAccordion.split(/\n\s*\n/).map((p) => decodeHtmlEntities(p.trim())).filter(Boolean)
    : [];

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="profile-header">
        <Link to={getBackLink()} className="back-link">
          <span>←</span>
          <span>Back</span>
        </Link>
      </header>

      <main className="profile-content">
        {/* Hero: one card — avatar, name + meta, then headline */}
        <div className="profile-hero">
          <div className="profile-hero-top">
            <div className="profile-avatar" aria-hidden>
              <AvatarPlaceholder />
              {politician.photo && (
                <img
                  src={`${pb.files.getURL(politician, politician.photo)}?t=${Date.now()}`}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>
            <div className="profile-info">
              <h1 className="profile-name">
                {decodeHtmlEntities(politician.name)}
              </h1>
              <div className="profile-meta">
                {politician.state && <span className="profile-meta-item">{politician.state}</span>}
                {(politician.party || politician.political_party) && (
                  <span className={`profile-meta-item profile-meta-party ${getPartyClass(politician.party || politician.political_party || '')}`}>
                    {politician.party || politician.political_party}
                  </span>
                )}
                {politician.district && (politician.office_type === 'representative' || (politician.chamber?.toString().toLowerCase() === 'representative')) && (
                  <span className="profile-meta-item">District {politician.district}</span>
                )}
                {getOfficeLabel() && (
                  <span className="profile-meta-item profile-meta-office">{getOfficeLabel()}</span>
                )}
              </div>
              {user && (
                <div className="profile-favorite-row">
                  {favoriteId ? (
                    <button
                      type="button"
                      className="profile-favorite-btn profile-favorite-remove"
                      onClick={handleRemoveFavorite}
                      disabled={favoriteLoading}
                    >
                      ♥ In your favorites — Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="profile-favorite-btn profile-favorite-add"
                      onClick={handleAddFavorite}
                      disabled={favoriteLoading}
                    >
                      {favoriteLoading ? '…' : '☆ Add to Favorites'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {headlineText && (
            <p className="profile-headline">
              {decodeHtmlEntities(headlineText)}
            </p>
          )}
        </div>

        {/* Biography – accordion, closed by default */}
        {showBiographyAccordion && (
          <ProfileAccordion title="Biography">
            <div className="profile-accordion-bio">
              {bioParagraphs.length > 0
                ? bioParagraphs.map((p, i) => (
                    <p key={i} className="profile-accordion-para">{p}</p>
                  ))
                : <p className="profile-accordion-para">{decodeHtmlEntities(bioForAccordion)}</p>}
            </div>
          </ProfileAccordion>
        )}

        {/* Connect & Learn More – accordion, closed by default */}
        {socialLinks.length > 0 && (
          <ProfileAccordion title="Connect & Learn More">
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
          </ProfileAccordion>
        )}

        {/* Latest News – accordion, closed by default */}
        {politician?.name && (
          <ProfileAccordion title="Latest News">
            <ProfileNewsFeed name={politician.name} limit={5} hideTitle />
          </ProfileAccordion>
        )}

        {/* Social (X, Facebook, YouTube) – accordion, closed by default */}
        {politician && (
          <ProfileAccordion title="Social">
            <SocialEmbeds politician={politician} hideTitle />
          </ProfileAccordion>
        )}

        {/* Comments – always visible section at the bottom */}
        {politician && (
          <section className="profile-comments-section">
            <ProfileComments politicianId={politician.id} />
          </section>
        )}
      </main>
    </div>
  );
}

export default PoliticianProfile;

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

type SocialIconType = 'x' | 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'linkedin' | 'truth_social' | 'wikipedia' | 'website';

function SocialIcon({ type, className }: { type: SocialIconType; className?: string }) {
  const size = 20;
  const common = { width: size, height: size, className: className ?? '' };
  switch (type) {
    case 'x':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden>
          <defs>
            <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FD5" />
              <stop offset="50%" stopColor="#FF543F" />
              <stop offset="100%" stopColor="#C837AB" />
            </linearGradient>
          </defs>
          <path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="#FF0000" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="#0A66C2" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'truth_social':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
    case 'wikipedia':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          {/* Clear W: left leg, valley, peak, valley, right leg */}
          <path d="M6 7v9.5l3-5 3 5 3-5 3 5V7" fill="none" />
        </svg>
      );
    case 'website':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    default:
      return null;
  }
}

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

  const getSocialLinks = (): Array<{ label: string; url: string; icon: SocialIconType }> => {
    if (!politician) return [];
    const links: Array<{ label: string; url: string; icon: SocialIconType }> = [];
    if (politician.x_url) {
      links.push({ label: 'X', url: politician.x_url, icon: 'x' });
    }
    if (politician.facebook_url) {
      links.push({ label: 'Facebook', url: politician.facebook_url, icon: 'facebook' });
    }
    if (politician.instagram_url) {
      links.push({ label: 'Instagram', url: politician.instagram_url, icon: 'instagram' });
    }
    if (politician.youtube_url) {
      links.push({ label: 'YouTube', url: politician.youtube_url, icon: 'youtube' });
    }
    if (politician.truth_social_url) {
      links.push({ label: 'Truth Social', url: politician.truth_social_url, icon: 'truth_social' });
    }
    if (politician.tiktok_url) {
      links.push({ label: 'TikTok', url: politician.tiktok_url, icon: 'tiktok' });
    }
    if (politician.linkedin_url) {
      links.push({ label: 'LinkedIn', url: politician.linkedin_url, icon: 'linkedin' });
    }
    if (politician.wikipedia_url) {
      links.push({ label: 'Wikipedia', url: politician.wikipedia_url, icon: 'wikipedia' });
    }
    const websiteRaw = politician.official_website_domain || politician.website_url;
    if (websiteRaw) {
      const websiteUrl = typeof websiteRaw === 'string' && !/^https?:\/\//i.test(websiteRaw.trim())
        ? `https://${websiteRaw.trim()}`
        : String(websiteRaw).trim();
      links.push({ label: 'Website', url: websiteUrl, icon: 'website' });
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
        const birthYear = birthDateRaw && typeof birthDateRaw === 'string'
          ? new Date(birthDateRaw).getFullYear()
          : null;
        // Only show "since" when date is clearly office start, not birth: require either
        // (1) we have birth_date and start year is at least 25 years after birth (House/Senate min age), or
        // (2) no birth_date and start year is recent (>= currentYear - 28) to avoid showing birth years
        const minOfficeYearNoBirth = currentYear - 28;
        const isPlausibleOfficeStart =
          birthYear !== null
            ? year >= birthYear + 25 && year <= currentYear + 1
            : year >= minOfficeYearNoBirth && year <= currentYear + 1;
        const isSameAsBirth = birthYear !== null && year === birthYear;
        if (isPlausibleOfficeStart && !isSameAsBirth) {
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

  // Headline under photo: one-liner (structured or stored). Accordion: prefer stored long bio when present.
  const raw = politician as unknown as Record<string, unknown>;
  const storedHeadline = stripCitationMarkers(((raw.headline ?? raw.bio) as string | undefined)?.trim() ?? '');
  const storedBioRaw = stripCitationMarkers((raw.bio as string | undefined)?.trim() ?? '');
  const storedBioCapped = truncateToWordLimit(storedBioRaw, BIO_DISPLAY_WORD_LIMIT);
  const headlineText = structuredBio ?? storedHeadline;
  // Use stored bio in accordion when we have a real multi-paragraph/long bio; otherwise one-liner
  const bioForAccordion =
    storedBioRaw.length > 200 ? storedBioCapped : (structuredBio ?? storedBioCapped);
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
        {/* Hero: avatar + name/meta, then headline */}
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
              {/* Connect icons – same profile space as picture */}
              {socialLinks.length > 0 && (
                <div className="profile-hero-links">
                  {socialLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-hero-link"
                      title={link.label}
                      aria-label={link.label}
                    >
                      <SocialIcon type={link.icon} className="profile-hero-link-icon" />
                    </a>
                  ))}
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

        {/* Biography | Latest News – two columns side by side */}
        <div className="profile-two-col">
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
          {politician?.name && (
            <ProfileAccordion title="Latest News">
              <ProfileNewsFeed name={politician.name} limit={5} hideTitle />
            </ProfileAccordion>
          )}
        </div>

        {/* Facebook | YouTube – two columns side by side, not in accordions */}
        {(politician?.facebook_url || politician?.youtube_url) && (
          <div className="profile-two-col profile-feeds-row">
            {politician.facebook_url && (
              <div className="profile-feed-card">
                <SocialEmbeds politician={politician} hideTitle platform="facebook" />
              </div>
            )}
            {politician.youtube_url && (
              <div className="profile-feed-card">
                <SocialEmbeds politician={politician} hideTitle platform="youtube" />
              </div>
            )}
          </div>
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

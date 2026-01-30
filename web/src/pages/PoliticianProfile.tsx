/**
 * Politician Profile Page - Matching directory page style
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician } from '../types/politician';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import SocialEmbeds from '../components/social/SocialEmbeds';
import BiographyAccordion from '../components/BiographyAccordion';
import './PoliticianProfile.css';

function PoliticianProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [politician, setPolitician] = useState<Politician | null>(null);
  const [loading, setLoading] = useState(true);

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
      }
    }
    
    // Default to home
    return '/';
  };

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

  // Normalize bio/headline/biography (PocketBase may use "bio" only, or "headline"/"biography" after schema update)
  const raw = politician as unknown as Record<string, unknown>;
  const hasDedicatedHeadline = Boolean((raw.headline ?? politician.headline) as string | undefined);
  const hasDedicatedBiography = Boolean((raw.biography ?? politician.biography) as string | undefined);
  const bioOrHeadline = (
    (raw.headline ?? raw.bio ?? politician.headline ?? politician.bio) as string | undefined
  )?.trim() ?? '';
  const biographyLong = (
    (raw.biography ?? raw.bio ?? politician.biography ?? politician.bio) as string | undefined
  )?.trim() ?? '';
  const isLongText = (s: string) => s.length > 200 || /\n\s*\n/.test(s);

  // Headline: prefer short line; if only one long "bio" exists, use first paragraph or first 150 chars
  let headlineText: string = hasDedicatedHeadline
    ? String(raw.headline ?? politician.headline ?? '').trim()
    : bioOrHeadline;
  if (!hasDedicatedHeadline && headlineText && isLongText(headlineText)) {
    const firstPara = headlineText.split(/\n\s*\n/)[0]?.trim() ?? headlineText;
    headlineText = firstPara.length > 150 ? firstPara.slice(0, 150).trim() + '…' : firstPara;
  }

  // Show accordion when we have long-form content and avoid duplicating a one-liner
  const showAccordion =
    biographyLong.length > 0 &&
    (hasDedicatedBiography ||
      (hasDedicatedHeadline && biographyLong !== headlineText) ||
      (!hasDedicatedHeadline && isLongText(biographyLong)));

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
        {/* Hero Section with Photo and Basic Info */}
        <div className="profile-hero">
          {/* Photo + Headline (headline by the image) */}
          <figure className="profile-hero-figure">
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
            {headlineText && (
              <figcaption className="profile-headline">
                {decodeHtmlEntities(headlineText)}
              </figcaption>
            )}
          </figure>

          {/* Name & Badges */}
          <div className="profile-info">
            <h1 className="profile-name">
              {decodeHtmlEntities(politician.name)}
            </h1>

            {/* Badges */}
            <div className="profile-badges">
              {politician.state && (
                <span className="profile-badge">{politician.state}</span>
              )}
              {(politician.party || politician.political_party) && (
                <span className={`profile-badge ${getPartyClass(politician.party || politician.political_party || '')}`}>
                  {politician.party || politician.political_party}
                </span>
              )}
              {politician.district && politician.office_type === 'representative' && (
                <span className="profile-badge">District {politician.district}</span>
              )}
              {(politician.office_title || politician.current_position) && (
                <span className="profile-badge">
                  {politician.office_title || politician.current_position}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Biography accordion – closed by default, 2–3 paragraph synopsis */}
        {showAccordion && biographyLong && (
          <BiographyAccordion content={biographyLong} />
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

        {/* Social Embeds Section */}
        {politician && <SocialEmbeds politician={politician} />}
      </main>
    </div>
  );
}

export default PoliticianProfile;

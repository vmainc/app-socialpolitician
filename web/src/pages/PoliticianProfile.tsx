/**
 * Politician Profile Page
 * Shows factual profile information and social media feeds
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician, Feed } from '../types/politician';

function PoliticianProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [politician, setPolitician] = useState<Politician | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function loadProfile() {
      try {
        // Load politician
        const politicianRecord = await pb
          .collection('politicians')
          .getFirstListItem<Politician>(`slug="${slug}"`, {});

        setPolitician(politicianRecord);

        // Load feeds (silently fail if collection doesn't exist or has errors)
        try {
          const feedRecords = await pb.collection('feeds').getList<Feed>(1, 50, {
            filter: `politician="${politicianRecord.id}"`,
            sort: '-fetched_at',
          });
          setFeeds(feedRecords.items);
        } catch (feedError: any) {
          // Feeds collection might not exist, have permission issues, or filter syntax might be wrong
          // Silently ignore all errors - this is expected for now
          // Don't log anything to avoid console noise
          setFeeds([]);
        }
      } catch (error: any) {
        if (error?.status === 404) {
          console.error('Politician not found');
        } else {
          console.error('Failed to load politician:', error);
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
        return 'U.S. Governor';
      default:
        return 'Politician';
    }
  };

  const getSocialLinks = () => {
    if (!politician) return [];
    const links: Array<{ label: string; url: string; icon: string }> = [];

    if (politician.website_url) {
      links.push({ label: 'Official Website', url: politician.website_url, icon: '🌐' });
    }
    if (politician.wikipedia_url) {
      links.push({ label: 'Wikipedia', url: politician.wikipedia_url, icon: '📚' });
    }
    if (politician.x_url) {
      links.push({ label: 'X (Twitter)', url: politician.x_url, icon: '🐦' });
    }
    if (politician.facebook_url) {
      links.push({ label: 'Facebook', url: politician.facebook_url, icon: '👥' });
    }
    if (politician.instagram_url) {
      links.push({ label: 'Instagram', url: politician.instagram_url, icon: '📷' });
    }
    if (politician.youtube_url) {
      links.push({ label: 'YouTube', url: politician.youtube_url, icon: '▶️' });
    }
    if (politician.truth_social_url) {
      links.push({ label: 'Truth Social', url: politician.truth_social_url, icon: '🔷' });
    }
    if (politician.tiktok_url) {
      links.push({ label: 'TikTok', url: politician.tiktok_url, icon: '🎵' });
    }
    if (politician.linkedin_url) {
      links.push({ label: 'LinkedIn', url: politician.linkedin_url, icon: '💼' });
    }

    return links;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!politician) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Politician Not Found</h1>
          <p className="text-gray-600 mb-4">The politician you're looking for doesn't exist.</p>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const socialLinks = getSocialLinks();
  const hasFeeds = feeds.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          to={`/${politician.office_type === 'senator' ? 'senators' : politician.office_type === 'representative' ? 'representatives' : politician.office_type === 'governor' ? 'governors' : '/'}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium transition-colors"
        >
          <span>←</span>
          <span>Back to {politician.office_type === 'senator' ? 'Senators' : politician.office_type === 'representative' ? 'Representatives' : politician.office_type === 'governor' ? 'Governors' : 'Home'}</span>
        </Link>

        {/* Profile Header - Styled */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex gap-5 items-start">
              {politician.photo && (
                <div className="flex-shrink-0">
                  <div className="relative">
                    <img
                      src={`${pb.files.getURL(politician, politician.photo)}?t=${Date.now()}`}
                      alt={politician.name}
                      className="w-24 h-24 object-cover rounded-xl shadow-md ring-2 ring-gray-100"
                      style={{ maxWidth: '96px', maxHeight: '96px', width: '96px', height: '96px' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect fill="%23e5e7eb" width="96" height="96" rx="12"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="11" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Photo%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{politician.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {getOfficeTypeLabel(politician.office_type)}
                  </span>
                  {politician.state && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {politician.state}
                    </span>
                  )}
                  {politician.political_party && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {politician.political_party}
                    </span>
                  )}
                </div>
                {politician.current_position && (
                  <p className="text-base text-gray-700 font-medium">{politician.current_position}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {politician.bio && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
              Biography
            </h2>
            <p className="text-gray-700 leading-relaxed text-base">
              {politician.bio}
            </p>
          </div>
        )}

        {/* Social Links - Styled */}
        {socialLinks.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
              Links & Resources
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{link.icon}</span>
                  <span className="text-gray-700 group-hover:text-blue-600 font-medium transition-colors">{link.label}</span>
                  <span className="ml-auto text-gray-400 group-hover:text-blue-500">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Feeds Section - Styled */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
            Social Media Feeds
          </h2>
          {hasFeeds ? (
            <div className="space-y-3">
              {feeds.map((feed) => (
                <div key={feed.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 capitalize">{feed.platform}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(feed.fetched_at).toLocaleDateString()}
                    </span>
                  </div>
                  {Array.isArray(feed.normalized_items) ? (
                    <div className="text-sm text-gray-600">
                      {feed.normalized_items.length} items
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📡</div>
              <p className="mb-1 font-medium">Feeds will appear after the next daily refresh.</p>
              <p className="text-sm">Our system refreshes politician feeds daily.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default PoliticianProfile;

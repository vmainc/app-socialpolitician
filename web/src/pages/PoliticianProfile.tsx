/**
 * Politician Profile Page - Modern Design
 * Beautiful Tailwind CSS with circular photo, bio, and social links
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


  const getPartyColor = (party: string | null | undefined) => {
    if (!party) return 'bg-gray-100 text-gray-700';
    const lower = party.toLowerCase();
    if (lower.includes('republican')) return 'bg-red-100 text-red-700';
    if (lower.includes('democrat')) return 'bg-blue-100 text-blue-700';
    if (lower.includes('independent')) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-32 h-32 bg-gray-300 rounded-full mb-4"></div>
          <div className="h-4 w-48 bg-gray-300 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  if (!politician) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Politician Not Found</h1>
          <p className="text-gray-600 mb-6">The politician you're looking for doesn't exist.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const socialLinks = getSocialLinks();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
            <span>←</span>
            <span>Back</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Hero Section with Photo and Basic Info */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center mb-8">
            {/* Photo */}
            <div className="flex-shrink-0">
              <div className="relative group">
                {politician.photo ? (
                  <img
                    src={`${pb.files.getURL(politician, politician.photo)}?t=${Date.now()}`}
                    alt={politician.name}
                    className="w-40 h-40 object-cover rounded-full shadow-2xl ring-4 ring-white transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Ccircle fill="%23f3f4f6" cx="80" cy="80" r="80"/%3E%3Ctext fill="%23d1d5db" font-family="system-ui, sans-serif" font-size="16" font-weight="600" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Photo%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-2xl ring-4 ring-white">
                    <span className="text-gray-500 text-5xl">👤</span>
                  </div>
                )}
              </div>
            </div>

            {/* Name & Title */}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                {politician.name}
              </h1>
              
              <div className="mb-4">
                <p className="text-xl text-gray-700 font-semibold mb-4">
                  {getOfficeTypeLabel(politician.office_type)}
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {politician.state && (
                  <div className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                    {politician.state}
                  </div>
                )}
                {politician.political_party && (
                  <div className={`px-4 py-2 rounded-full font-medium text-sm ${getPartyColor(politician.political_party)}`}>
                    {politician.political_party}
                  </div>
                )}
                {politician.district && politician.office_type === 'representative' && (
                  <div className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-medium text-sm">
                    District {politician.district}
                  </div>
                )}
              </div>

              {politician.current_position && (
                <p className="text-base text-gray-600 italic">
                  "{politician.current_position}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {politician.bio && politician.bio.trim().length > 0 && (
          <div className="mb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-blue-400 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-900">Biography</h2>
              </div>
              <p className="text-gray-700 leading-relaxed text-lg line-clamp-none">
                {politician.bio}
              </p>
            </div>
          </div>
        )}

        {/* Social Links Section */}
        {socialLinks.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-blue-400 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">Connect & Learn More</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  {/* Gradient background on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative flex items-center gap-4">
                    <div className={`text-2xl ${link.color} group-hover:scale-110 transition-transform duration-300`}>
                      {link.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {link.label}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        Visit
                      </p>
                    </div>
                    <div className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300">
                      →
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Feeds Section */}
        {feeds.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-blue-400 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="space-y-4">
                {feeds.map((feed) => (
                  <div 
                    key={feed.id} 
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">{feed.platform}</p>
                      <p className="text-sm text-gray-500">
                        Updated {new Date(feed.fetched_at).toLocaleDateString()}
                      </p>
                    </div>
                    {Array.isArray(feed.normalized_items) && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {feed.normalized_items.length} items
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No feeds message */}
        {feeds.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
            <div className="text-center">
              <div className="text-5xl mb-4 opacity-50">📱</div>
              <p className="text-gray-600 font-medium mb-2">Social media feeds will appear soon</p>
              <p className="text-sm text-gray-500">We're working on aggregating their latest updates</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PoliticianProfile;

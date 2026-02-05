/**
 * Politician Profile Page (web/pages duplicate)
 * Loads from politicians collection only. News/social come from ProfileNewsFeed and SocialEmbeds in src version.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician } from '../types/politician';

function PoliticianProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [politician, setPolitician] = useState<Politician | null>(null);
  const [loading, setLoading] = useState(true);

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
        } else {
          console.error('Failed to load politician:', error);
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [slug]);

  const getOfficeTypeLabel = (type: string) => {
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

    if (politician.official_website) {
      links.push({ label: 'Official Website', url: politician.official_website, icon: '🌐' });
    }
    if (politician.wikipedia_URL) {
      links.push({ label: 'Wikipedia', url: politician.wikipedia_URL, icon: '📚' });
    }
    if (politician.twitter_url) {
      links.push({ label: 'Twitter', url: politician.twitter_url, icon: '🐦' });
    }
    if (politician.facebook) {
      links.push({ label: 'Facebook', url: politician.facebook, icon: '👥' });
    }
    if (politician.instagram) {
      links.push({ label: 'Instagram', url: politician.instagram, icon: '📷' });
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          to={`/${politician.office_type === 'senator' ? 'senators' : politician.office_type === 'representative' ? 'representatives' : 'governors'}`}
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to {politician.office_type === 'senator' ? 'Senators' : politician.office_type === 'representative' ? 'Representatives' : 'Governors'}
        </Link>

        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {politician.profile_picture && (
              <div className="flex-shrink-0">
                <img
                  src={politician.profile_picture}
                  alt={politician.name}
                  className="w-48 h-48 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{politician.name}</h1>
              <p className="text-xl text-gray-600 mb-4">
                {getOfficeTypeLabel(politician.office_type)}
                {politician.state && ` • ${politician.state}`}
                {politician.political_party && ` • ${politician.political_party}`}
              </p>
              {politician.current_position && (
                <p className="text-lg text-gray-700 mb-4">{politician.current_position}</p>
              )}
              {politician.bio && (
                <p className="text-gray-700 mb-4">{politician.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <span className="text-blue-600 hover:text-blue-800">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default PoliticianProfile;

/**
 * Directory page for Senators, Representatives, or Governors
 */

import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician } from '../types/politician';
import { getPoliticianRoute } from '../lib/pb';

function PoliticiansDirectory() {
  const location = useLocation();
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine office type from URL path
  const pathType = location.pathname.split('/')[1];
  const officeType = pathType === 'senators' ? 'senator' : 
                    pathType === 'representatives' ? 'representative' :
                    pathType === 'governors' ? 'governor' : null;

  useEffect(() => {
    if (!officeType) {
      setLoading(false);
      return;
    }

    async function loadPoliticians() {
      try {
        const records = await pb.collection('politicians').getFullList<Politician>({
          filter: `office_type="${officeType}"`,
          sort: '-politician_rank,name',
        });
        setPoliticians(records);
      } catch (error) {
        console.error('Failed to load politicians:', error);
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

  const getPartyColor = (party: string | null | undefined) => {
    if (!party) return 'bg-gray-100 text-gray-700';
    const partyLower = party.toLowerCase();
    if (partyLower.includes('republican')) return 'bg-red-100 text-red-700';
    if (partyLower.includes('democrat')) return 'bg-blue-100 text-blue-700';
    if (partyLower.includes('independent')) return 'bg-gray-100 text-gray-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!officeType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Page</h1>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">{getTitle()}</h1>
          <p className="text-gray-600 mt-2">
            {politicians.length} {officeType === 'senator' ? 'Senators' : officeType === 'representative' ? 'Representatives' : 'Governors'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {politicians.map((politician) => (
            <Link
              key={politician.id}
              to={getPoliticianRoute(politician)}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 block"
            >
              {politician.profile_picture && (
                <div className="mb-4">
                  <img
                    src={politician.profile_picture}
                    alt={politician.name}
                    className="w-full aspect-square object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}
              <h3 className="font-semibold text-gray-900 text-lg mb-2">
                {politician.name}
              </h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {politician.state && (
                  <span className="text-sm text-gray-600">{politician.state}</span>
                )}
                {politician.political_party && (
                  <span className={`text-xs px-2 py-1 rounded ${getPartyColor(politician.political_party)}`}>
                    {politician.political_party}
                  </span>
                )}
              </div>
              {politician.current_position && (
                <p className="text-sm text-gray-600 mb-2">{politician.current_position}</p>
              )}
              <div className="text-blue-600 text-sm font-medium mt-2">
                View Profile →
              </div>
            </Link>
          ))}
        </div>

        {politicians.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No politicians found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PoliticiansDirectory;

/**
 * President Profile Page
 * Displays factual, educational profile information about a president
 * Separate from Chat - this is factual-only, no persona-driven content
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { President } from '../types/president';
import {
  formatDateHuman,
  computeServedLabel,
  normalizeArrayField,
  normalizeMajorEvents,
} from '../lib/profileHelpers';

function PresidentProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [president, setPresident] = useState<President | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('Invalid president slug');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        // Fetch by slug (PocketBase filter)
        const records = await pb
          .collection('presidents')
          .getList<President>(1, 1, {
            filter: `slug = "${slug}"`,
          });

        if (!cancelled) {
          if (records.items.length === 0) {
            setError('President not found');
            setLoading(false);
            return;
          }

          setPresident(records.items[0]);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load president:', err);
          setError('Failed to load president profile');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  function getPortraitUrl(p: President): string {
    if (p.portrait) {
      return pb.files.getUrl(p, p.portrait);
    }
    return '/placeholder-president.jpg';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (error || !president) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'President not found'}</p>
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to Presidents
          </Link>
        </div>
      </div>
    );
  }

  const servedLabel = computeServedLabel(president);
  const vicePresidents = normalizeArrayField(president.vice_presidents);
  const education = normalizeArrayField(president.education);
  const professions = normalizeArrayField(president.professions);
  const majorEvents = normalizeMajorEvents(president.major_events);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 underline mb-4 inline-block"
          >
            ← Back to Presidents
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <img
              src={getPortraitUrl(president)}
              alt={president.name}
              className="w-32 h-32 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
              }}
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold text-gray-900">{president.name}</h1>
                <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                  Factual Profile
                </span>
              </div>
              {president.party && (
                <p className="text-lg text-gray-600 mt-1">{president.party}</p>
              )}
              {servedLabel && (
                <p className="text-sm text-gray-500 mt-1">Served: {servedLabel}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 italic">
            This profile shows only stored factual fields. For conversation, use{' '}
            <Link
              to={`/chat/${president.id}`}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Chat
            </Link>
            .
          </p>
        </div>

        {/* Term of Service */}
        {servedLabel && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Term of Service</h2>
            <p className="text-gray-700">{servedLabel}</p>
          </section>
        )}

        {/* Background */}
        {(president.birthplace || president.birth_date || president.death_date || president.home_state) && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Background</h2>
            <dl className="space-y-2">
              {president.birthplace && (
                <>
                  <dt className="font-semibold text-gray-700">Birthplace</dt>
                  <dd className="text-gray-600 ml-4">{president.birthplace}</dd>
                </>
              )}
              {president.birth_date && (
                <>
                  <dt className="font-semibold text-gray-700">Birth Date</dt>
                  <dd className="text-gray-600 ml-4">{formatDateHuman(president.birth_date) || president.birth_date}</dd>
                </>
              )}
              {president.death_date && (
                <>
                  <dt className="font-semibold text-gray-700">Death Date</dt>
                  <dd className="text-gray-600 ml-4">{formatDateHuman(president.death_date) || president.death_date}</dd>
                </>
              )}
              {president.home_state && (
                <>
                  <dt className="font-semibold text-gray-700">Home State</dt>
                  <dd className="text-gray-600 ml-4">{president.home_state}</dd>
                </>
              )}
            </dl>
          </section>
        )}

        {/* Family */}
        {president.spouse && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Family</h2>
            <dl className="space-y-2">
              <dt className="font-semibold text-gray-700">Spouse</dt>
              <dd className="text-gray-600 ml-4">{president.spouse}</dd>
            </dl>
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Education</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {education.map((edu, idx) => (
                <li key={idx}>{edu}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Before the Presidency */}
        {professions.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Before the Presidency</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {professions.map((prof, idx) => (
                <li key={idx}>{prof}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Vice President(s) */}
        {vicePresidents.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Vice President(s)</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {vicePresidents.map((vp, idx) => (
                <li key={idx}>{vp}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Major Events / Notable Actions */}
        {majorEvents.length > 0 && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Major Events / Notable Actions</h2>
            <ul className="space-y-3">
              {majorEvents.map((event, idx) => (
                <li key={idx} className="text-gray-700">
                  {event.date && (
                    <span className="font-semibold text-gray-600">
                      {formatDateHuman(event.date) || event.date}:{' '}
                    </span>
                  )}
                  {event.source_url ? (
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {event.label}
                    </a>
                  ) : (
                    event.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Link
            to={`/chat/${president.id}`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Chat with {president.name}
          </Link>
          <Link
            to="/"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Back to Presidents
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PresidentProfilePage;

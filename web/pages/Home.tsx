/**
 * Home page - shows Senators, Representatives, and Governors sections
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { Politician } from '../types/politician';
import { buildOfficeFilter } from '../src/lib/pb';

function Home() {
  const [counts, setCounts] = useState({
    senators: 0,
    representatives: 0,
    governors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCounts() {
      try {
        // Use safe filter helpers that prefer chamber/status enum fields
        const senatorFilter = buildOfficeFilter('senator');
        const representativeFilter = buildOfficeFilter('representative');
        const governorFilter = buildOfficeFilter('governor');
        
        console.log('🔍 Home page filters:', {
          baseUrl: pb.baseUrl,
          collection: 'politicians',
          senators: senatorFilter,
          representatives: representativeFilter,
          governors: governorFilter,
        });
        
        // Runtime assertion: prevent !~ usage
        [senatorFilter, representativeFilter, governorFilter].forEach((f, i) => {
          if (f.includes('!~')) {
            throw new Error(
              `❌ FORBIDDEN: Filter ${['senators', 'representatives', 'governors'][i]} contains !~ operator. Use pbNotContains() helper instead.`
            );
          }
        });
        
        const [senators, representatives, governors] = await Promise.all([
          pb.collection('politicians').getList(1, 1, {
            filter: senatorFilter,
          }),
          pb.collection('politicians').getList(1, 1, {
            filter: representativeFilter,
          }),
          pb.collection('politicians').getList(1, 1, {
            filter: governorFilter,
          }),
        ]);

        console.log('✅ Home page counts:', {
          senators: senators.totalItems,
          representatives: representatives.totalItems,
          governors: governors.totalItems,
        });

        setCounts({
          senators: senators.totalItems,
          representatives: representatives.totalItems,
          governors: governors.totalItems,
        });
      } catch (error) {
        console.error('❌ Failed to load counts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCounts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Social Politician
          </h1>
          <p className="text-xl text-gray-600">
            Browse politicians and their social media feeds
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Senators */}
          <Link
            to="/senators"
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-8 text-center"
          >
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {counts.senators}
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Senators
            </h2>
            <p className="text-gray-600 mb-4">
              View all U.S. Senators
            </p>
            <div className="text-blue-600 font-medium">
              View all →
            </div>
          </Link>

          {/* Representatives */}
          <Link
            to="/representatives"
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-8 text-center"
          >
            <div className="text-4xl font-bold text-green-600 mb-2">
              {counts.representatives}
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Representatives
            </h2>
            <p className="text-gray-600 mb-4">
              View all U.S. Representatives
            </p>
            <div className="text-green-600 font-medium">
              View all →
            </div>
          </Link>

          {/* Governors */}
          <Link
            to="/governors"
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-8 text-center"
          >
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {counts.governors}
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Governors
            </h2>
            <p className="text-gray-600 mb-4">
              View all U.S. Governors
            </p>
            <div className="text-purple-600 font-medium">
              View all →
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;

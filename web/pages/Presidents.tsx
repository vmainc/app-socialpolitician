import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { getUserName, setUserName } from '../lib/session';
import { President } from '../types/president';
import { computeServedLabel } from '../lib/profileHelpers';

type SortMode = 'alphabetical' | 'chronological';

function Presidents() {
  const navigate = useNavigate();
  const [presidents, setPresidents] = useState<President[]>([]);
  const [filteredPresidents, setFilteredPresidents] = useState<President[]>([]);
  const [userName, setUserNameState] = useState(getUserName());
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('chronological');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    
    async function load() {
      try {
        const records = await pb.collection('presidents').getFullList<President>();
        if (!cancelled) {
          setPresidents(records);
        }
      } catch (error: any) {
        if (!cancelled && error?.status !== 0) {
          // Ignore autocancellation errors (status 0)
          console.error('Failed to load presidents:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    load();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Chronological order mapping (approximate term start years)
  const getPresidentOrder = (name: string): number => {
    const order: Record<string, number> = {
      'George Washington': 1,
      'John Adams': 2,
      'Thomas Jefferson': 3,
      'James Madison': 4,
      'James Monroe': 5,
      'John Quincy Adams': 6,
      'Andrew Jackson': 7,
      'Martin Van Buren': 8,
      'William Henry Harrison': 9,
      'John Tyler': 10,
      'James K. Polk': 11,
      'Zachary Taylor': 12,
      'Millard Fillmore': 13,
      'Franklin Pierce': 14,
      'James Buchanan': 15,
      'Abraham Lincoln': 16,
      'Andrew Johnson': 17,
      'Ulysses S. Grant': 18,
      'Rutherford B. Hayes': 19,
      'James A. Garfield': 20,
      'Chester A. Arthur': 21,
      'Grover Cleveland': 22,
      'Benjamin Harrison': 23,
      'William McKinley': 24,
      'Theodore Roosevelt': 25,
      'William Howard Taft': 26,
      'Woodrow Wilson': 27,
      'Warren G. Harding': 28,
      'Calvin Coolidge': 29,
      'Herbert Hoover': 30,
      'Franklin D. Roosevelt': 31,
      'Harry S. Truman': 32,
      'Dwight D. Eisenhower': 33,
      'John F. Kennedy': 34,
      'Lyndon B. Johnson': 35,
      'Richard Nixon': 36,
      'Gerald Ford': 37,
      'Jimmy Carter': 38,
      'Ronald Reagan': 39,
      'George H. W. Bush': 40,
      'Bill Clinton': 41,
      'George W. Bush': 42,
      'Barack Obama': 43,
      'Donald Trump': 44,
      'Joe Biden': 45,
    };
    return order[name] || 999;
  };

  useEffect(() => {
    // Apply sorting only (no search filter)
    const sorted = [...presidents].sort((a, b) => {
      if (sortMode === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else {
        // Chronological
        return getPresidentOrder(a.name) - getPresidentOrder(b.name);
      }
    });
    
    setFilteredPresidents(sorted);
  }, [presidents, sortMode]);

  // loadPresidents moved to useEffect with cleanup

  function handleUserNameChange(value: string) {
    setUserNameState(value);
    setUserName(value);
  }

  function getPortraitUrl(president: President): string {
    if (president.portrait) {
      return pb.files.getUrl(president, president.portrait);
    }
    return '/placeholder-president.jpg';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading presidents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Voices of the Presidency
          </h1>
          <p className="text-gray-600">
            Conversations with America's Presidents — in their own words.
          </p>
        </div>

        <div className="mb-6 max-w-md mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your name
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => handleUserNameChange(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mb-6 max-w-md mx-auto space-y-3">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setSortMode('alphabetical')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortMode === 'alphabetical'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                A–Z
              </button>
              <button
                onClick={() => setSortMode('chronological')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortMode === 'chronological'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Chronological
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => {
                    setCompareMode(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedForCompare(new Set());
                    }
                  }}
                  className="rounded"
                />
                Compare mode
              </label>
              {compareMode && selectedForCompare.size === 2 && (
                <button
                  onClick={() => {
                    const [left, right] = Array.from(selectedForCompare);
                    navigate(`/compare?left=${left}&right=${right}`);
                  }}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Compare Selected
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredPresidents.map((president) => {
            const isSelected = selectedForCompare.has(president.id);
            const servedLabel = computeServedLabel(president);
            // Extract years from served label for display
            const servedYears = servedLabel 
              ? servedLabel.match(/\d{4}/g)?.join('–') || servedLabel
              : null;
            
            return (
            <div
              key={president.id}
              className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 ${
                compareMode && isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <button
                onClick={() => {
                  if (compareMode) {
                    const newSelected = new Set(selectedForCompare);
                    if (isSelected) {
                      newSelected.delete(president.id);
                    } else if (newSelected.size < 2) {
                      newSelected.add(president.id);
                    }
                    setSelectedForCompare(newSelected);
                  } else {
                    navigate(`/chat/${president.id}`);
                  }
                }}
                className="w-full text-left"
              >
                <div className="mb-3">
                  <img
                    src={getPortraitUrl(president)}
                    alt={president.name}
                    className="w-full aspect-square object-cover rounded-lg cursor-pointer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <h3 className="font-medium text-gray-900 text-sm mb-1 text-center">
                  {president.name}
                </h3>
              </button>
              
              {/* Years served */}
              {servedYears && (
                <p className="text-xs text-gray-600 font-medium mb-3 text-center">
                  {servedYears}
                </p>
              )}
              
              {/* Action icons */}
              <div className="flex items-center justify-center gap-3 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!compareMode) {
                      navigate(`/chat/${president.id}`);
                    }
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                  title="Chat"
                  disabled={compareMode}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
                
                <Link
                  to={`/presidents/${president.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  title="Profile"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              </div>
              
              {compareMode && isSelected && (
                <div className="mt-2 text-xs text-blue-600">✓ Selected</div>
              )}
            </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default Presidents;

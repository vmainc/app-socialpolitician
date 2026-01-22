import { Link } from 'react-router-dom';

export default function Compare() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Compare Presidents</h1>
        <p className="text-gray-600 mb-6">This feature is coming soon.</p>
        <Link to="/presidents" className="text-blue-600 hover:text-blue-800 underline">
          ← Back to Presidents
        </Link>
      </div>
    </div>
  );
}

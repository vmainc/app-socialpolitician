import { useParams, Link } from 'react-router-dom';

export default function Quote() {
  const { shareId } = useParams<{ shareId: string }>();
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Shared Quote</h1>
        <p className="text-gray-600 mb-4">Share ID: {shareId || 'N/A'}</p>
        <p className="text-gray-600 mb-6">This feature is coming soon.</p>
        <Link to="/presidents" className="text-blue-600 hover:text-blue-800 underline">
          ← Back to Presidents
        </Link>
      </div>
    </div>
  );
}

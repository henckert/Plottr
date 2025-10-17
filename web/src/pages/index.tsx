import { useEffect, useState } from 'react';
import Link from 'next/link';
import { venueApi, Venue } from '@/lib/api';

export default function Home() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);
        const response = await venueApi.list(10, cursor || undefined);
        setVenues(response.data);
        setCursor(response.next_cursor || null);
        setHasMore(!!response.next_cursor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch venues');
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  const handleLoadMore = () => {
    if (hasMore) {
      setCursor(cursor);
    }
  };

  if (loading && venues.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading venues...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Venues</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {venues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No venues found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <Link key={venue.id} href={`/venues/${venue.id}`}>
                  <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="p-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {venue.name}
                      </h2>
                      <p className="text-gray-600 mb-4">{venue.address}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          View details →
                        </span>
                        <span className="text-primary hover:underline">Open</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { venueApi, pitchApi, Venue, Pitch } from '@/lib/api';

export default function VenueDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [venue, setVenue] = useState<Venue | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const [venueData, pitchesData] = await Promise.all([
          venueApi.getById(id),
          pitchApi.list(50),
        ]);
        setVenue(venueData);
        setPitches(pitchesData.data.filter((p) => p.venue_id === id));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch venue');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl text-error mb-4">{error || 'Venue not found'}</div>
        <Link href="/" className="text-primary hover:underline">
          Back to venues
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/" className="text-primary hover:underline mb-4 block">
            ← Back to venues
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Details</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="text-lg text-gray-900">
                    {venue.address}, {venue.city}, {venue.state} {venue.zip}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="text-lg text-gray-900">
                    {venue.location.coordinates[1].toFixed(4)}, {venue.location.coordinates[0].toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-lg text-gray-900">
                    {new Date(venue.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Pitches ({pitches.length})
              </h2>
              {pitches.length === 0 ? (
                <p className="text-gray-500">No pitches found</p>
              ) : (
                <div className="space-y-4">
                  {pitches.map((pitch) => (
                    <Link
                      key={pitch.id}
                      href={`/pitches/${pitch.id}?venue=${venue.id}`}
                    >
                      <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {pitch.name}
                        </h3>
                        <p className="text-gray-600 mb-2">Surface: {pitch.surface}</p>
                        <span className="text-primary hover:underline">View pitch →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Pitches</dt>
                  <dd className="text-2xl font-bold text-primary">{pitches.length}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">City</dt>
                  <dd className="text-lg font-medium text-gray-900">{venue.city}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">State</dt>
                  <dd className="text-lg font-medium text-gray-900">{venue.state}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { pitchApi, sessionApi, Pitch, Session } from '@/lib/api';

export default function PitchDetail() {
  const router = useRouter();
  const { id, venue } = router.query;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !pitch) return;

    if (map.current) return; // Prevent re-initializing

    try {
      // Use OpenStreetMap tiles (free alternative)
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://demotiles.maplibre.org/style.json',
        center: [
          pitch.boundary.coordinates[0][0][0],
          pitch.boundary.coordinates[0][0][1],
        ],
        zoom: 14,
      });

      // Add GeoJSON source for the pitch polygon
      map.current.on('load', () => {
        if (!map.current) return;
        
        map.current.addSource('pitch-boundary', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: pitch.boundary,
            properties: { name: pitch.name },
          },
        });

        // Add polygon layer
        map.current.addLayer({
          id: 'pitch-polygon',
          type: 'fill',
          source: 'pitch-boundary',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.5,
          },
        });

        // Add outline layer
        map.current.addLayer({
          id: 'pitch-outline',
          type: 'line',
          source: 'pitch-boundary',
          paint: {
            'line-color': '#1e40af',
            'line-width': 2,
          },
        });

        // Fit bounds to polygon
        const bounds = new maplibregl.LngLatBounds();
        pitch.boundary.coordinates[0].forEach(([lon, lat]) => {
          bounds.extend([lon, lat]);
        });
        map.current.fitBounds(bounds, { padding: 80 });
      });
    } catch (err) {
      console.error('Failed to initialize map:', err);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [pitch]);

  // Fetch pitch and sessions
  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const [pitchData, sessionsData] = await Promise.all([
          pitchApi.getById(id),
          sessionApi.list(50),
        ]);
        setPitch(pitchData);
        setSessions(sessionsData.data.filter((s) => s.pitch_id === id));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pitch');
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

  if (error || !pitch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl text-error mb-4">{error || 'Pitch not found'}</div>
        <Link href={`/venues/${venue || ''}`} className="text-primary hover:underline">
          Back to venue
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href={`/venues/${venue || ''}`}
            className="text-primary hover:underline mb-4 block"
          >
            ← Back to venue
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{pitch.name}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Map */}
            <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
              <div ref={mapContainer} className="w-full h-96" />
            </div>

            {/* Details */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Details</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Surface</dt>
                  <dd className="text-lg text-gray-900">{pitch.surface}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-lg text-gray-900">
                    {new Date(pitch.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Sessions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Sessions ({sessions.length})
              </h2>
              {sessions.length === 0 ? (
                <p className="text-gray-500">No sessions scheduled</p>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/sessions/${session.id}?pitch=${pitch.id}`}
                    >
                      <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {session.name}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600 mb-2">
                          <p>
                            {new Date(session.start_time).toLocaleString()} -{' '}
                            {new Date(session.end_time).toLocaleTimeString()}
                          </p>
                          <p>
                            Status:{' '}
                            <span
                              className={`font-medium ${
                                session.status === 'scheduled'
                                  ? 'text-success'
                                  : session.status === 'ongoing'
                                  ? 'text-warning'
                                  : 'text-gray-500'
                              }`}
                            >
                              {session.status}
                            </span>
                          </p>
                        </div>
                        <span className="text-primary hover:underline">
                          View session →
                        </span>
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
                  <dt className="text-sm text-gray-500">Surface Type</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pitch.surface}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Sessions</dt>
                  <dd className="text-2xl font-bold text-primary">
                    {sessions.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Coordinates</dt>
                  <dd className="text-xs text-gray-600 font-mono">
                    {pitch.boundary.coordinates[0][0][1].toFixed(4)}°,{' '}
                    {pitch.boundary.coordinates[0][0][0].toFixed(4)}°
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

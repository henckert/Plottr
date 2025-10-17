import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { sessionApi, pitchApi, Session, Pitch } from '@/lib/api';

export default function SessionDetail() {
  const router = useRouter();
  const { id, pitch } = router.query;
  const [session, setSession] = useState<Session | null>(null);
  const [pitchData, setPitchData] = useState<Pitch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const sessionData = await sessionApi.getById(id);
        setSession(sessionData);

        // Fetch pitch data if we have pitch id from query or session data
        if (pitch || sessionData.pitch_id) {
          const pitch_id = pitch || sessionData.pitch_id;
          const pitchDetail = await pitchApi.getById(pitch_id as string);
          setPitchData(pitchDetail);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch session');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, pitch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-success text-white';
      case 'ongoing':
        return 'bg-warning text-gray-900';
      case 'completed':
        return 'bg-gray-400 text-white';
      case 'cancelled':
        return 'bg-error text-white';
      default:
        return 'bg-gray-200 text-gray-900';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-xl text-error mb-4">{error || 'Session not found'}</div>
        <Link href={`/pitches/${pitch || ''}`} className="text-primary hover:underline">
          Back to pitch
        </Link>
      </div>
    );
  }

  const startTime = new Date(session.start_time);
  const endTime = new Date(session.end_time);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href={`/pitches/${pitch || ''}`} className="text-primary hover:underline mb-4 block">
            ← Back to pitch
          </Link>
          <div className="flex items-start justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{session.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(session.status)}`}>
              {session.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Time Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Time Details</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Start Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {startTime.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">End Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {endTime.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-primary bg-opacity-10 rounded-lg border border-primary">
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="text-lg font-semibold text-primary">
                      {duration} minutes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pitch Information */}
            {pitchData && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Pitch Information</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Pitch Name</p>
                    <p className="text-lg font-semibold text-gray-900">{pitchData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Surface Type</p>
                    <p className="text-lg font-semibold text-gray-900">{pitchData.surface}</p>
                  </div>
                  <Link
                    href={`/pitches/${pitchData.id}`}
                    className="text-primary hover:underline block mt-4"
                  >
                    View full pitch details →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Summary</h2>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(session.status)}`}>
                    {session.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Duration</p>
                  <p className="text-2xl font-bold text-primary">{duration} min</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {startTime.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {startTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {endTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Session ID</p>
                  <p className="text-xs font-mono text-gray-600 break-all mt-1">
                    {session.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

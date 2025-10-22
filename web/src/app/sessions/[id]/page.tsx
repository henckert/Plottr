'use client';

/**
 * Session Detail Page
 * 
 * Displays session information with:
 * - Session details (venue, pitch, time, notes)
 * - Map showing pitch location
 * - Edit and delete actions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sessionApi, venueApi, pitchApi } from '@/lib/api';
import type { Session, Venue, Pitch } from '@/lib/api';

interface SessionDetailPageProps {
  params: {
    id: string;
  };
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const router = useRouter();
  
  // Data state
  const [session, setSession] = useState<Session | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successMessage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sessionData = await sessionApi.getById(Number(params.id));
      setSession(sessionData);
      
      // Load venue
      if (sessionData.venue_id) {
        const venueData = await venueApi.getById(sessionData.venue_id);
        setVenue(venueData);
      }
      
      // Load pitch if specified
      if (sessionData.pitch_id) {
        const pitchData = await pitchApi.getById(sessionData.pitch_id);
        setPitch(pitchData);
      }
    } catch (err) {
      console.error('[SessionDetailPage] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      await sessionApi.delete(session.id, session.version_token || 'null-token');
      setSuccessMessage('Session deleted successfully!');
      
      // Redirect to sessions list after short delay
      setTimeout(() => {
        router.push('/sessions');
      }, 1500);
    } catch (err) {
      console.error('[SessionDetailPage] Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const formatDateTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Not set';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getDuration = () => {
    if (!session?.start_ts || !session?.end_ts) return null;
    
    try {
      const start = new Date(session.start_ts);
      const end = new Date(session.end_ts);
      const diffMs = end.getTime() - start.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/sessions')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Session Not Found</h1>
          <button
            onClick={() => router.push('/sessions')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => router.push('/sessions')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Session #{session.id}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Created {formatDate(session.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push(`/sessions/${session.id}/edit`)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Session Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Venue</dt>
                  <dd className="text-base text-gray-900 mt-1">
                    {venue ? (
                      <button
                        onClick={() => router.push(`/venues/${venue.id}`)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {venue.name}
                      </button>
                    ) : (
                      `Venue #${session.venue_id}`
                    )}
                  </dd>
                  {venue?.address && (
                    <dd className="text-sm text-gray-600 mt-1">
                      📍 {venue.address}
                    </dd>
                  )}
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Pitch</dt>
                  <dd className="text-base text-gray-900 mt-1">
                    {session.pitch_id ? (
                      pitch ? (
                        <button
                          onClick={() => router.push(`/venues/${session.venue_id}#pitch-${pitch.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {pitch.name} {pitch.sport && `(${pitch.sport})`}
                        </button>
                      ) : (
                        `Pitch #${session.pitch_id}`
                      )
                    ) : (
                      <span className="text-gray-500">No specific pitch</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Schedule Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Start Time</dt>
                  <dd className="text-base text-gray-900 mt-1">
                    {formatDateTime(session.start_ts)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">End Time</dt>
                  <dd className="text-base text-gray-900 mt-1">
                    {formatDateTime(session.end_ts)}
                  </dd>
                </div>

                {getDuration() && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Duration</dt>
                    <dd className="text-base text-gray-900 mt-1">
                      ⏱️ {getDuration()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Notes */}
            {session.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{session.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Metadata */}
          <div className="lg:col-span-1 space-y-6">
            {/* Metadata Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">Session ID</dt>
                  <dd className="text-gray-900 mt-1 font-mono">#{session.id}</dd>
                </div>

                <div>
                  <dt className="font-medium text-gray-500">Created</dt>
                  <dd className="text-gray-900 mt-1">
                    {formatDate(session.created_at)}
                  </dd>
                </div>

                <div>
                  <dt className="font-medium text-gray-500">Last Updated</dt>
                  <dd className="text-gray-900 mt-1">
                    {formatDate(session.updated_at)}
                  </dd>
                </div>

                {session.share_token && (
                  <div>
                    <dt className="font-medium text-gray-500">Share Token</dt>
                    <dd className="text-gray-900 mt-1 font-mono text-xs break-all">
                      {session.share_token}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Quick Actions */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/venues/${session.venue_id}`)}
                  className="w-full text-left text-sm text-blue-800 hover:text-blue-900 hover:underline"
                >
                  → View Venue Details
                </button>
                {session.pitch_id && (
                  <button
                    onClick={() => router.push(`/venues/${session.venue_id}#pitch-${session.pitch_id}`)}
                    className="w-full text-left text-sm text-blue-800 hover:text-blue-900 hover:underline"
                  >
                    → View Pitch Details
                  </button>
                )}
                <button
                  onClick={() => router.push('/sessions/new')}
                  className="w-full text-left text-sm text-blue-800 hover:text-blue-900 hover:underline"
                >
                  → Create Another Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          ✅ {successMessage}
        </div>
      )}

      {/* Error Message Toast */}
      {error && session && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          ❌ {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * Sessions List Page
 * 
 * Displays all training sessions and matches with:
 * - Filterable list by venue, pitch, date range
 * - Session cards with time, location, status
 * - Calendar view toggle (future enhancement)
 * - Create new session button
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sessionApi, venueApi, pitchApi } from '@/lib/api';
import type { Session, Venue, Pitch } from '@/lib/api';

export default function SessionsListPage() {
  const router = useRouter();
  
  // Data state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Filter state
  const [venueFilter, setVenueFilter] = useState<number | 'all'>('all');
  const [pitchFilter, setPitchFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadSessions();
  }, [venueFilter, pitchFilter]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [venuesData, sessionsData] = await Promise.all([
        venueApi.list(100), // Load venues for filter
        sessionApi.list(undefined, undefined, 50),
      ]);
      
      setVenues(venuesData.data);
      setSessions(sessionsData.data);
      setHasMore(sessionsData.has_more);
      setNextCursor(sessionsData.next_cursor);
    } catch (err) {
      console.error('[SessionsListPage] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (cursor?: string) => {
    try {
      if (!cursor) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const venueId = venueFilter === 'all' ? undefined : venueFilter;
      const pitchId = pitchFilter === 'all' ? undefined : pitchFilter;
      
      const response = await sessionApi.list(venueId, pitchId, 50, cursor);
      
      if (cursor) {
        setSessions((prev) => [...prev, ...response.data]);
      } else {
        setSessions(response.data);
      }
      
      setHasMore(response.has_more);
      setNextCursor(response.next_cursor);
    } catch (err) {
      console.error('[SessionsListPage] Load sessions error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      loadSessions(nextCursor);
    }
  };

  const handleSessionClick = (sessionId: number) => {
    router.push(`/sessions/${sessionId}`);
  };

  const formatTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Not scheduled';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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

  const getDuration = (startTs: string | null | undefined, endTs: string | null | undefined) => {
    if (!startTs || !endTs) return null;
    try {
      const start = new Date(startTs);
      const end = new Date(endTs);
      const diffMs = end.getTime() - start.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    } catch {
      return null;
    }
  };

  const getVenueName = (venueId: number) => {
    const venue = venues.find((v) => v.id === venueId);
    return venue?.name || `Venue #${venueId}`;
  };

  const getPitchName = (pitchId: number | null | undefined) => {
    if (!pitchId) return 'No pitch assigned';
    const pitch = pitches.find((p) => p.id === pitchId);
    return pitch?.name || `Pitch #${pitchId}`;
  };

  // Load pitches when venue filter changes
  useEffect(() => {
    if (venueFilter !== 'all') {
      pitchApi.list(venueFilter).then((response) => {
        setPitches(response.data);
      }).catch(console.error);
    } else {
      setPitches([]);
    }
  }, [venueFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
              <p className="text-sm text-gray-600 mt-1">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={() => router.push('/sessions/new')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              + Create Session
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Venue Filter */}
            <div>
              <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-1">
                Venue
              </label>
              <select
                id="venue"
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Venues</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pitch Filter */}
            <div>
              <label htmlFor="pitch" className="block text-sm font-medium text-gray-700 mb-1">
                Pitch
              </label>
              <select
                id="pitch"
                value={pitchFilter}
                onChange={(e) => setPitchFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                disabled={venueFilter === 'all' || pitches.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="all">All Pitches</option>
                {pitches.map((pitch) => (
                  <option key={pitch.id} value={pitch.id}>
                    {pitch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            ❌ {error}
          </div>
        )}

        {/* Sessions Grid */}
        {sessions.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No sessions found</p>
            <p className="text-gray-400 text-sm mt-2">
              {venueFilter !== 'all' || pitchFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first session to get started'}
            </p>
            <button
              onClick={() => router.push('/sessions/new')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Session
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session.id)}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
            >
              <div className="p-5">
                {/* Session ID/Title */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Session #{session.id}
                    </h3>
                    {session.notes && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {session.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📍</span>
                    <span className="font-medium">{getVenueName(session.venue_id)}</span>
                  </div>
                  {session.pitch_id && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">⚽</span>
                      <span>{getPitchName(session.pitch_id)}</span>
                    </div>
                  )}
                </div>

                {/* Time Info */}
                <div className="space-y-1 mb-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Start:</span> {formatTime(session.start_ts)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">End:</span> {formatTime(session.end_ts)}
                  </div>
                  {getDuration(session.start_ts, session.end_ts) && (
                    <div className="text-sm text-gray-500">
                      <span className="mr-1">⏱️</span>
                      {getDuration(session.start_ts, session.end_ts)}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                  <span>Created {formatDate(session.created_at)}</span>
                  <span className="text-blue-600 font-medium">View →</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

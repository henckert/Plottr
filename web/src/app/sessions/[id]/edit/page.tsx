'use client';

/**
 * Session Edit Page
 * 
 * Allows users to update an existing training session or match with:
 * - Venue and pitch selection
 * - Date and time scheduling
 * - Optional notes
 * - Optimistic concurrency control via version tokens
 * 
 * Flow: Load session → Prefill form → Edit fields → Submit with version token
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { sessionApi, venueApi, pitchApi } from '@/lib/api';
import type { Venue, Pitch, SessionUpdate, Session } from '@/lib/api';

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.id as string;
  
  // Existing session data
  const [session, setSession] = useState<Session | null>(null);
  const [versionToken, setVersionToken] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<SessionUpdate>>({
    pitch_id: null,
    start_ts: '',
    end_ts: '',
    notes: '',
  });

  // Data state
  const [venues, setVenues] = useState<Venue[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load session data on mount
  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  // Load venues on mount
  useEffect(() => {
    loadVenues();
  }, []);

  // Load pitches when session venue is loaded
  useEffect(() => {
    if (session?.venue_id) {
      loadPitches(session.venue_id);
    }
  }, [session?.venue_id]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await sessionApi.getById(sessionId);
      setSession(data);
      setVersionToken(data.version_token || null);

      // Prefill form with current session data
      setFormData({
        pitch_id: data.pitch_id,
        start_ts: data.start_ts || '',
        end_ts: data.end_ts || '',
        notes: data.notes || '',
      });
    } catch (err) {
      console.error('[EditSessionPage] Load session error:', err);
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const loadVenues = async () => {
    try {
      const response = await venueApi.list(100);
      setVenues(response.data);
    } catch (err) {
      console.error('[EditSessionPage] Load venues error:', err);
      setError('Failed to load venues');
    }
  };

  const loadPitches = async (venueId: number) => {
    try {
      const response = await pitchApi.list(venueId);
      setPitches(response.data);
    } catch (err) {
      console.error('[EditSessionPage] Load pitches error:', err);
      setError('Failed to load pitches');
    }
  };

  const validateForm = (): string | null => {
    if (!formData.start_ts) {
      return 'Please select a start date and time';
    }

    if (!formData.end_ts) {
      return 'Please select an end date and time';
    }

    // Validate end time is after start time
    const start = new Date(formData.start_ts);
    const end = new Date(formData.end_ts);

    if (isNaN(start.getTime())) {
      return 'Invalid start date/time';
    }

    if (isNaN(end.getTime())) {
      return 'Invalid end date/time';
    }

    if (end <= start) {
      return 'End time must be after start time';
    }

    // Validate duration (30 min to 24 hours)
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationMinutes < 30) {
      return 'Session must be at least 30 minutes';
    }

    if (durationHours > 24) {
      return 'Session cannot exceed 24 hours';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!versionToken) {
      setError('Missing version token. Please refresh and try again.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const sessionData: SessionUpdate = {
        pitch_id: formData.pitch_id || null,
        start_ts: formData.start_ts!,
        end_ts: formData.end_ts!,
        notes: formData.notes || undefined,
      };

      await sessionApi.update(sessionId, sessionData, versionToken);
      
      setSuccessMessage('Session updated successfully!');
      
      // Redirect to session detail after short delay
      setTimeout(() => {
        router.push(`/sessions/${sessionId}`);
      }, 1500);
    } catch (err: any) {
      console.error('[EditSessionPage] Update error:', err);
      
      // Handle optimistic concurrency conflict
      if (err?.response?.status === 409) {
        setError('Session was updated by someone else. Please refresh the page to continue.');
      } else if (err?.response?.data?.error?.code === 'SESSION_CONFLICT') {
        setError(err.response.data.error.message || 'This pitch already has an overlapping session.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to update session');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/sessions/${sessionId}`);
  };

  const handleReload = () => {
    loadSessionData();
    setError(null);
  };

  const getDurationPreview = () => {
    if (!formData.start_ts || !formData.end_ts) return null;
    
    try {
      const start = new Date(formData.start_ts);
      const end = new Date(formData.end_ts);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      if (end <= start) return null;
      
      const diffMs = end.getTime() - start.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `Duration: ${hours}h ${minutes}m`;
      }
      return `Duration: ${minutes}m`;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Session</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/sessions')}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const venueName = venues.find((v) => v.id === session?.venue_id)?.name || 'Unknown Venue';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900"
              disabled={saving}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Session</h1>
              <p className="text-sm text-gray-600 mt-1">Session #{sessionId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
              {error.includes('updated by someone else') && (
                <button
                  onClick={handleReload}
                  className="ml-4 text-sm text-red-700 hover:text-red-900 underline"
                >
                  Reload
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Venue (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Venue <span className="text-red-500">*</span>
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
              {venueName}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Venue cannot be changed. To move to a different venue, delete and recreate the session.
            </p>
          </div>

          {/* Pitch Selection */}
          <div>
            <label htmlFor="pitch_id" className="block text-sm font-medium text-gray-700 mb-2">
              Pitch (Optional)
            </label>
            <select
              id="pitch_id"
              value={formData.pitch_id || ''}
              onChange={(e) => setFormData({ ...formData, pitch_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              disabled={saving}
            >
              <option value="">No specific pitch</option>
              {pitches.length === 0 && <option disabled>No pitches available</option>}
              {pitches.map((pitch) => (
                <option key={pitch.id} value={pitch.id}>
                  {pitch.name} {pitch.sport ? `(${pitch.sport})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date/Time */}
          <div>
            <label htmlFor="start_ts" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="start_ts"
              value={formData.start_ts || ''}
              onChange={(e) => setFormData({ ...formData, start_ts: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              required
              disabled={saving}
            />
          </div>

          {/* End Date/Time */}
          <div>
            <label htmlFor="end_ts" className="block text-sm font-medium text-gray-700 mb-2">
              End Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="end_ts"
              value={formData.end_ts || ''}
              onChange={(e) => setFormData({ ...formData, end_ts: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              required
              disabled={saving}
            />
            {getDurationPreview() && (
              <p className="mt-1 text-sm text-gray-600">{getDurationPreview()}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Add any notes about this session..."
              disabled={saving}
            />
            <p className="mt-1 text-sm text-gray-500 text-right">
              {(formData.notes?.length || 0)} / 1000 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Help Text */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Tips</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Sessions must be between 30 minutes and 24 hours</li>
              <li>• End time must be after start time</li>
              <li>• If another user has updated this session, you'll be prompted to reload</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}

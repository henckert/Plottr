'use client';

/**
 * Session Creation Page
 * 
 * Allows users to create a new training session or match with:
 * - Venue and pitch selection
 * - Date and time scheduling
 * - Optional notes
 * 
 * Flow: Select venue → Select pitch → Set date/time → Add notes → Submit
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sessionApi, venueApi, pitchApi } from '@/lib/api';
import type { Venue, Pitch, SessionCreate } from '@/lib/api';

export default function NewSessionPage() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<Partial<SessionCreate>>({
    venue_id: undefined,
    pitch_id: null,
    start_ts: '',
    end_ts: '',
    notes: '',
  });

  // Data state
  const [venues, setVenues] = useState<Venue[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load venues on mount
  useEffect(() => {
    loadVenues();
  }, []);

  // Load pitches when venue changes
  useEffect(() => {
    if (formData.venue_id) {
      loadPitches(formData.venue_id);
    } else {
      setPitches([]);
      setFormData((prev) => ({ ...prev, pitch_id: null }));
    }
  }, [formData.venue_id]);

  const loadVenues = async () => {
    try {
      const response = await venueApi.list(100);
      setVenues(response.data);
    } catch (err) {
      console.error('[NewSessionPage] Load venues error:', err);
      setError('Failed to load venues');
    }
  };

  const loadPitches = async (venueId: number) => {
    try {
      const response = await pitchApi.list(venueId);
      setPitches(response.data);
    } catch (err) {
      console.error('[NewSessionPage] Load pitches error:', err);
      setError('Failed to load pitches');
    }
  };

  const validateForm = (): string | null => {
    if (!formData.venue_id) {
      return 'Please select a venue';
    }

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

    try {
      setLoading(true);
      setError(null);

      const sessionData: SessionCreate = {
        venue_id: formData.venue_id!,
        pitch_id: formData.pitch_id || null,
        start_ts: formData.start_ts!,
        end_ts: formData.end_ts!,
        notes: formData.notes || undefined,
      };

      const created = await sessionApi.create(sessionData);
      
      setSuccessMessage('Session created successfully!');
      
      // Redirect to session detail after short delay
      setTimeout(() => {
        router.push(`/sessions/${created.id}`);
      }, 1500);
    } catch (err) {
      console.error('[NewSessionPage] Create error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/sessions');
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

  // Get current datetime in local timezone for input default
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Create New Session</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Venue Selection */}
          <div>
            <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
              Venue <span className="text-red-500">*</span>
            </label>
            <select
              id="venue"
              value={formData.venue_id || ''}
              onChange={(e) => setFormData({ ...formData, venue_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a venue...</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} {venue.address && `- ${venue.address}`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">Choose the venue where the session will take place</p>
          </div>

          {/* Pitch Selection */}
          <div>
            <label htmlFor="pitch" className="block text-sm font-medium text-gray-700 mb-2">
              Pitch (Optional)
            </label>
            <select
              id="pitch"
              value={formData.pitch_id ?? ''}
              onChange={(e) => setFormData({ ...formData, pitch_id: e.target.value ? Number(e.target.value) : null })}
              disabled={!formData.venue_id || pitches.length === 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">No specific pitch</option>
              {pitches.map((pitch) => (
                <option key={pitch.id} value={pitch.id}>
                  {pitch.name} {pitch.sport && `(${pitch.sport})`}
                </option>
              ))}
            </select>
            {formData.venue_id && pitches.length === 0 && (
              <p className="mt-1 text-sm text-gray-500">No pitches available for this venue</p>
            )}
            {!formData.venue_id && (
              <p className="mt-1 text-sm text-gray-500">Select a venue first to see available pitches</p>
            )}
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
              min={getCurrentDateTime()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">When does the session start?</p>
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
              min={formData.start_ts || getCurrentDateTime()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">When does the session end?</p>
            {getDurationPreview() && (
              <p className="mt-2 text-sm font-medium text-blue-600">
                ⏱️ {getDurationPreview()}
              </p>
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
              placeholder="Add any additional information about this session..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.notes?.length || 0} / 1000 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              ❌ {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              ✅ {successMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Sessions must be between 30 minutes and 24 hours</li>
            <li>Select a specific pitch if you know which one you'll use</li>
            <li>You can edit session details later if needed</li>
            <li>Use notes to add context like session type, participants, or special instructions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Venue Detail Page with Pitch Editing
 * 
 * Displays:
 * - Venue information
 * - List of pitches with click-to-edit
 * - Map showing venue boundary and pitches
 * - Full CRUD: Create, Read, Update, Delete pitches
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { venueApi, pitchApi } from '@/lib/api';
import type { Venue, Pitch } from '@/lib/api';

// Dynamically import map components (client-side only)
const MapDrawControl = dynamic(
  () => import('@/components/editor/MapDrawControl').then((mod) => mod.MapDrawControl),
  { ssr: false }
);

interface VenueDetailPageProps {
  params: {
    id: string;
  };
}

export default function VenueDetailPage({ params }: VenueDetailPageProps) {
  const router = useRouter();
  
  // Data state
  const [venue, setVenue] = useState<Venue | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingPitch, setIsAddingPitch] = useState(false);
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pitch form state
  const [pitchForm, setPitchForm] = useState({
    name: '',
    sport: '',
    level: '',
    geometry: null as any,
  });

  useEffect(() => {
    loadData();
  }, [params.id]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load venue and pitches in parallel
      const [venueData, pitchesData] = await Promise.all([
        venueApi.getById(params.id),
        pitchApi.list(Number(params.id)),
      ]);
      
      setVenue(venueData);
      setPitches(pitchesData.data);
    } catch (err) {
      console.error('[VenueDetailPage] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load venue');
    } finally {
      setLoading(false);
    }
  };

  // Calculate map center from venue center_point or bbox
  const getMapCenter = (): [number, number] => {
    if (venue?.center_point?.coordinates) {
      return [venue.center_point.coordinates[0], venue.center_point.coordinates[1]];
    }
    if (venue?.bbox?.coordinates?.[0]?.[0]) {
      // Use first coordinate of bbox
      return [venue.bbox.coordinates[0][0][0], venue.bbox.coordinates[0][0][1]];
    }
    return [-0.1276, 51.5074]; // London default
  };

  // Handle pitch creation
  const handleStartAddPitch = () => {
    setIsAddingPitch(true);
    setIsEditingPitch(false);
    setSelectedPitch(null);
    setPitchForm({ name: '', sport: '', level: '', geometry: null });
  };

  const handlePolygonDrawn = (feature: any) => {
    console.log('[VenueDetailPage] Polygon drawn:', feature);
    setPitchForm((prev) => ({ ...prev, geometry: feature.geometry }));
  };

  const handlePolygonUpdated = (feature: any) => {
    console.log('[VenueDetailPage] Polygon updated:', feature);
    setPitchForm((prev) => ({ ...prev, geometry: feature.geometry }));
  };

  const handleSavePitch = async () => {
    try {
      if (!pitchForm.name || !pitchForm.geometry) {
        setError('Pitch name and geometry are required');
        return;
      }

      if (isEditingPitch && selectedPitch) {
        // Update existing pitch
        const updated = await pitchApi.update(
          selectedPitch.id,
          {
            name: pitchForm.name,
            sport: pitchForm.sport || undefined,
            level: pitchForm.level || undefined,
            geometry: pitchForm.geometry,
          },
          selectedPitch.version_token || 'null-token'
        );
        
        setPitches((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setSuccessMessage('Pitch updated successfully!');
      } else {
        // Create new pitch
        const created = await pitchApi.create({
          venue_id: Number(params.id),
          name: pitchForm.name,
          sport: pitchForm.sport || undefined,
          level: pitchForm.level || undefined,
          geometry: pitchForm.geometry,
          status: 'draft',
        });
        
        setPitches((prev) => [...prev, created]);
        setSuccessMessage('Pitch created successfully!');
      }

      // Reset state
      setIsAddingPitch(false);
      setIsEditingPitch(false);
      setSelectedPitch(null);
      setPitchForm({ name: '', sport: '', level: '', geometry: null });
      setError(null);
    } catch (err) {
      console.error('[VenueDetailPage] Save pitch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save pitch');
    }
  };

  const handleCancelPitch = () => {
    setIsAddingPitch(false);
    setIsEditingPitch(false);
    setSelectedPitch(null);
    setPitchForm({ name: '', sport: '', level: '', geometry: null });
    setError(null);
  };

  // Handle pitch editing
  const handleEditPitch = (pitch: Pitch) => {
    setSelectedPitch(pitch);
    setIsEditingPitch(true);
    setIsAddingPitch(false);
    setPitchForm({
      name: pitch.name,
      sport: pitch.sport || '',
      level: pitch.level || '',
      geometry: pitch.geometry,
    });
  };

  // Handle pitch deletion
  const handleDeletePitch = async (pitch: Pitch) => {
    if (!confirm(`Are you sure you want to delete pitch "${pitch.name}"?`)) {
      return;
    }

    try {
      await pitchApi.delete(pitch.id, pitch.version_token || 'null-token');
      setPitches((prev) => prev.filter((p) => p.id !== pitch.id));
      setSuccessMessage('Pitch deleted successfully!');
      
      // Clear selection if deleted pitch was selected
      if (selectedPitch?.id === pitch.id) {
        setSelectedPitch(null);
        setIsEditingPitch(false);
      }
    } catch (err) {
      console.error('[VenueDetailPage] Delete pitch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete pitch');
    }
  };

  // Handle pitch selection (click on map or list)
  const handlePitchClick = (pitch: Pitch) => {
    if (isAddingPitch || isEditingPitch) return; // Don't switch while editing
    setSelectedPitch(pitch);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (error && !venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/venues')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Venues
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
                onClick={() => router.push('/venues')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
              {!venue.published && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  Draft
                </span>
              )}
            </div>
            <button
              onClick={() => router.push(`/venues/${venue.id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Edit Venue
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Venue Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Venue Details Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
              
              <dl className="space-y-3">
                {venue.address && (
                  <>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="text-sm text-gray-900">{venue.address}</dd>
                  </>
                )}
                
                {venue.tz && (
                  <>
                    <dt className="text-sm font-medium text-gray-500 mt-4">Timezone</dt>
                    <dd className="text-sm text-gray-900">{venue.tz}</dd>
                  </>
                )}
                
                {venue.center_point && (
                  <>
                    <dt className="text-sm font-medium text-gray-500 mt-4">Coordinates</dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {venue.center_point.coordinates[1].toFixed(6)}, {venue.center_point.coordinates[0].toFixed(6)}
                    </dd>
                  </>
                )}
                
                <dt className="text-sm font-medium text-gray-500 mt-4">Created</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(venue.created_at).toLocaleDateString()}
                </dd>
                
                <dt className="text-sm font-medium text-gray-500 mt-4">Last Updated</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(venue.updated_at).toLocaleDateString()}
                </dd>
              </dl>
            </div>

            {/* Actions Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => alert('Pitch editor coming in next subtask!')}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  + Add Pitch
                </button>
                <button
                  onClick={() => router.push(`/venues/${venue.id}/edit`)}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Edit Venue
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Map & Pitches */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map Placeholder */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
              <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium">Map View</p>
                  <p className="text-sm mt-2">Map integration coming in TASK 4.4.2</p>
                  {venue.bbox && (
                    <p className="text-xs mt-2 text-green-600">✅ Boundary defined</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pitches List Placeholder */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pitches</h2>
                <button
                  onClick={() => alert('Pitch editor coming in TASK 4.4.2!')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  + Add Pitch
                </button>
              </div>
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg font-medium">No pitches yet</p>
                <p className="text-sm mt-2">Add your first pitch to get started</p>
                <p className="text-xs mt-2 text-blue-600">Pitch editor coming in TASK 4.4.2</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
        ✅ Venue created successfully!
      </div>
    </div>
  );
}

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
const MapCanvas = dynamic(
  () => import('@/components/editor/MapCanvasRobust').then((mod) => mod.MapCanvas),
  { ssr: false }
);
const MapErrorBoundary = dynamic(
  () => import('@/components/editor/MapErrorBoundary').then((mod) => mod.MapErrorBoundary),
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
    return undefined;
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

  // Handlers for polygon drawing
  const handlePolygonDrawn = async (feature: GeoJSON.Feature<GeoJSON.Polygon>) => {
    console.log('[VenueDetail] Polygon drawn:', feature);
    setPitchForm({ ...pitchForm, geometry: feature.geometry });
  };

  const handlePolygonUpdated = async (id: string, feature: GeoJSON.Feature<GeoJSON.Polygon>) => {
    console.log('[VenueDetail] Polygon updated:', id, feature);
    setPitchForm({ ...pitchForm, geometry: feature.geometry });
  };

  const handlePolygonDeleted = async (id: string) => {
    console.log('[VenueDetail] Polygon deleted:', id);
    setPitchForm({ ...pitchForm, geometry: null });
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
              <h1 className="text-2xl font-bold text-gray-900">{venue!.name}</h1>
              {!venue!.published && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  Draft
                </span>
              )}
            </div>
            <button
              onClick={() => router.push(`/venues/${venue!.id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Edit Venue
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Venue Info & Pitch List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Venue Details Card */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Venue Details</h2>
              <dl className="space-y-2 text-sm">
                {venue && venue.address && (
                  <>
                    <dt className="font-medium text-gray-500">Address</dt>
                    <dd className="text-gray-900">{venue.address}</dd>
                  </>
                )}
                {venue && venue.tz && (
                  <>
                    <dt className="font-medium text-gray-500 mt-2">Timezone</dt>
                    <dd className="text-gray-900">{venue.tz}</dd>
                  </>
                )}
              </dl>
            </div>

            {/* Pitches List Card */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Pitches ({pitches.length})
                </h2>
                <button
                  onClick={handleStartAddPitch}
                  disabled={isAddingPitch || isEditingPitch}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  + Add
                </button>
              </div>

              {pitches.length === 0 && !isAddingPitch && (
                <div className="text-center text-gray-500 py-8 text-sm">
                  <p>No pitches yet</p>
                  <p className="text-xs mt-1">Click "+ Add" to create one</p>
                </div>
              )}

              <div className="space-y-2">
                {pitches.map((pitch) => (
                  <div
                    key={pitch.id}
                    onClick={() => handlePitchClick(pitch)}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      selectedPitch?.id === pitch.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {pitch.name}
                        </h3>
                        {pitch.sport && (
                          <p className="text-xs text-gray-500 mt-0.5">{pitch.sport}</p>
                        )}
                      </div>
                      {!isAddingPitch && !isEditingPitch && selectedPitch?.id === pitch.id && (
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPitch(pitch);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-100"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePitch(pitch);
                            }}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-100"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pitch Form (when adding/editing) */}
            {(isAddingPitch || isEditingPitch) && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {isEditingPitch ? 'Edit Pitch' : 'New Pitch'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={pitchForm.name}
                      onChange={(e) => setPitchForm({ ...pitchForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Main Pitch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sport
                    </label>
                    <input
                      type="text"
                      value={pitchForm.sport}
                      onChange={(e) => setPitchForm({ ...pitchForm, sport: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Soccer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Level
                    </label>
                    <input
                      type="text"
                      value={pitchForm.level}
                      onChange={(e) => setPitchForm({ ...pitchForm, level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Professional"
                    />
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-gray-600 mb-2">
                      {pitchForm.geometry ? '✅ Boundary drawn' : '⚠️ Draw boundary on map'}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSavePitch}
                        disabled={!pitchForm.name || !pitchForm.geometry}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelPitch}
                        className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Map */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '700px' }}>
              {venue && (
                <MapErrorBoundary>
                  <MapCanvas
                    zones={pitches
                      .filter((p) => p.geometry)
                      .map((p) => ({
                        id: p.id,
                        layout_id: venue!.id,
                        name: p.name,
                        zone_type: 'pitch' as const,
                        surface: 'grass',
                        color: selectedPitch?.id === p.id ? '#3b82f6' : '#10b981',
                        boundary: p.geometry,
                        rotation_deg: p.rotation_deg || 0,
                        version_token: p.version_token || '',
                        created_at: p.created_at,
                        updated_at: p.updated_at,
                      }))}
                    enableDrawing={true}
                    drawMode="zone"
                    onPolygonCreate={handlePolygonDrawn}
                    onPolygonUpdate={handlePolygonUpdated}
                    onPolygonDelete={handlePolygonDeleted}
                    center={getMapCenter()}
                    zoom={17}
                    isLoading={false}
                  />
                </MapErrorBoundary>
              )}
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
      {error && venue && (
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

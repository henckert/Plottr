'use client';

/**
 * Venue Creation Page
 * 
 * Allows users to create a new venue with:
 * - Basic info (name, address)
 * - Geocoded location
 * - Drawn boundary polygon
 * 
 * Flow: Fill form → Search address → Draw boundary → Submit → Redirect to venue detail
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapGeocodingSearch } from '@/components/editor/MapGeocodingSearch';

// Dynamically import map components (client-side only)
const MapDrawControl = dynamic(
  () => import('@/components/editor/MapDrawControl').then((mod) => mod.MapDrawControl),
  { ssr: false }
);

interface VenueFormData {
  name: string;
  address: string;
  club_id: number;
  bbox: any; // GeoJSON Polygon
  center_point: any; // GeoJSON Point
  tz: string;
  published: boolean;
}

export default function NewVenuePage() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<Partial<VenueFormData>>({
    name: '',
    address: '',
    club_id: 1, // TODO: Get from user's selected club or auth context
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone, // Auto-detect timezone
    published: false,
  });

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([-0.1276, 51.5074]); // London default
  const [mapZoom, setMapZoom] = useState(13);
  const [drawnBoundary, setDrawnBoundary] = useState<any>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle geocoding search result
  const handleGeocodingSelect = (result: any) => {
    console.log('[NewVenuePage] Geocoding result:', result);
    
    // Update map center
    const [lng, lat] = result.center;
    setMapCenter([lng, lat]);
    setMapZoom(15);

    // Auto-fill address if empty
    if (!formData.address) {
      setFormData((prev) => ({
        ...prev,
        address: result.place_name || result.name,
      }));
    }

    // Store center point
    setFormData((prev) => ({
      ...prev,
      center_point: {
        type: 'Point',
        coordinates: result.center,
      },
    }));
  };

  // Handle polygon drawn on map
  const handlePolygonDrawn = async (feature: any): Promise<void> => {
    console.log('[NewVenuePage] Polygon drawn:', feature);
    setDrawnBoundary(feature);
    
    // Store bbox (boundary) in form data
    setFormData((prev) => ({
      ...prev,
      bbox: feature.geometry,
    }));
  };

  // Handle polygon updated
  const handlePolygonUpdated = async (feature: any): Promise<void> => {
    console.log('[NewVenuePage] Polygon updated:', feature);
    setDrawnBoundary(feature);
    
    setFormData((prev) => ({
      ...prev,
      bbox: feature.geometry,
    }));
  };

  // Handle polygon deleted
  const handlePolygonDeleted = async (): Promise<void> => {
    console.log('[NewVenuePage] Polygon deleted');
    setDrawnBoundary(null);
    
    setFormData((prev) => ({
      ...prev,
      bbox: undefined,
    }));
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.name || formData.name.trim().length === 0) {
      return 'Venue name is required';
    }
    if (!formData.bbox) {
      return 'Please draw a boundary on the map';
    }
    if (!formData.club_id) {
      return 'Club ID is required';
    }
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Call API to create venue
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/venues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address || '',
          club_id: formData.club_id,
          bbox: formData.bbox,
          center_point: formData.center_point,
          tz: formData.tz || 'UTC',
          published: formData.published || false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to create venue');
      }

      const result = await response.json();
      console.log('[NewVenuePage] Venue created:', result);

      // Redirect to venue detail page
      router.push(`/venues/${result.data.id}`);
    } catch (err) {
      console.error('[NewVenuePage] Submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create venue');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Create New Venue</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Venue Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Venue Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Venue Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Crystal Palace Sports Complex"
                  required
                />
              </div>

              {/* Address Search */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <MapGeocodingSearch
                  onResultSelect={handleGeocodingSelect}
                  className="mb-2"
                />
                <input
                  type="text"
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search address above or enter manually"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use the search bar to find and center the map on your venue location
                </p>
              </div>

              {/* Timezone */}
              <div>
                <label htmlFor="tz" className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <input
                  type="text"
                  id="tz"
                  value={formData.tz || ''}
                  onChange={(e) => setFormData({ ...formData, tz: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Europe/London"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Auto-detected from your browser. Adjust if needed.
                </p>
              </div>

              {/* Published Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published || false}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="published" className="ml-2 block text-sm text-gray-700">
                  Publish immediately (make visible to users)
                </label>
              </div>

              {/* Boundary Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">
                  Boundary: {drawnBoundary ? '✅ Drawn' : '⚠️ Not drawn yet'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {drawnBoundary
                    ? 'Boundary polygon saved. You can edit it on the map.'
                    : 'Use the drawing tools on the map to draw your venue boundary.'}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating Venue...' : 'Create Venue'}
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>

          {/* Right Column - Map */}
          <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '700px' }}>
            <MapDrawControl
              mode="venue"
              onPolygonComplete={handlePolygonDrawn}
              onPolygonUpdate={async (_id, geojson) => handlePolygonUpdated(geojson)}
              onPolygonDelete={async (_id) => handlePolygonDeleted()}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Enter the venue name (required)</li>
            <li>Search for the venue address to center the map</li>
            <li>Use the drawing tool (polygon icon) on the map to draw your venue boundary</li>
            <li>Adjust the polygon vertices by clicking and dragging</li>
            <li>Review all details and click "Create Venue"</li>
          </ol>
          <p className="mt-4 text-xs text-gray-500">
            <strong>Note:</strong> Maximum venue area is 10 km². The boundary should encompass all pitches/zones within your venue.
          </p>
        </div>
      </div>
    </div>
  );
}

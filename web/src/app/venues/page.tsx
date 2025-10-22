'use client';

/**
 * Venue List Page
 * 
 * Displays all venues with:
 * - Searchable card list
 * - Filters (published/draft status)
 * - Map preview with venue markers
 * - Pagination (cursor-based)
 * - Create new venue button
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { venueApi } from '@/lib/api';
import type { Venue } from '@/lib/api';

// Dynamically import map components (client-side only)
const MapCanvas = dynamic(
  () => import('@/components/editor/MapCanvasRobust').then((mod) => mod.MapCanvas),
  { ssr: false }
);
const MapErrorBoundary = dynamic(
  () => import('@/components/editor/MapErrorBoundary').then((mod) => mod.MapErrorBoundary),
  { ssr: false }
);

export default function VenuesListPage() {
  const router = useRouter();
  
  // Data state
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  
  // Map state
  const [selectedVenueId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    loadVenues();
  }, []);

  // Apply filters when search or status filter changes
  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, venues]);

  const loadVenues = async (cursor?: string) => {
    try {
      if (!cursor) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);
      
      const response = await venueApi.list(50, cursor);
      
      if (cursor) {
        // Append to existing venues (pagination)
        setVenues((prev) => [...prev, ...response.data]);
      } else {
        // Replace venues (initial load)
        setVenues(response.data);
      }
      
      setHasMore(response.has_more);
      setNextCursor(response.next_cursor);
    } catch (err) {
      console.error('[VenuesListPage] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load venues');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...venues];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((v) =>
        v.name.toLowerCase().includes(query) ||
        (v.address && v.address.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (statusFilter === 'published') {
      filtered = filtered.filter((v) => v.published);
    } else if (statusFilter === 'draft') {
      filtered = filtered.filter((v) => !v.published);
    }
    
    setFilteredVenues(filtered);
  };

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      loadVenues(nextCursor);
    }
  };

  const handleVenueClick = (venueId: number) => {
    router.push(`/venues/${venueId}`);
  };

  // Note: handleMarkerClick would be used if MapCanvas supported marker click callbacks
  // Currently using venue card click for selection

  // Calculate map center (average of all venue locations)
  const getMapCenter = (): [number, number] => {
    if (venues.length === 0) return [-0.1276, 51.5074]; // London default
    
    const validVenues = venues.filter((v) => v.center_point?.coordinates);
    if (validVenues.length === 0) return [-0.1276, 51.5074];
    
    const avgLon = validVenues.reduce((sum, v) => sum + v.center_point.coordinates[0], 0) / validVenues.length;
    const avgLat = validVenues.reduce((sum, v) => sum + v.center_point.coordinates[1], 0) / validVenues.length;
    
    return [avgLon, avgLat];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading venues...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
              <p className="text-sm text-gray-600 mt-1">
                {filteredVenues.length} venue{filteredVenues.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={() => router.push('/venues/new')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              + Create Venue
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Search, Filters, Venue List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search & Filters Card */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search Input */}
                <div className="md:col-span-2">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    id="search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or address..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Toggle Map Button (mobile) */}
              <div className="mt-4 lg:hidden">
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
                >
                  {showMap ? '📋 Show List' : '🗺️ Show Map'}
                </button>
              </div>
            </div>

            {/* Venue Cards Grid */}
            {!showMap && (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    ❌ {error}
                  </div>
                )}

                {filteredVenues.length === 0 && !error && (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-500 text-lg">No venues found</p>
                    <p className="text-gray-400 text-sm mt-2">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first venue to get started'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVenues.map((venue) => (
                    <div
                      key={venue.id}
                      id={`venue-${venue.id}`}
                      onClick={() => handleVenueClick(venue.id)}
                      className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 ${
                        selectedVenueId === venue.id
                          ? 'border-blue-500'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {venue.name}
                            </h3>
                            {venue.address && (
                              <p className="text-sm text-gray-600 mt-1 truncate">
                                📍 {venue.address}
                              </p>
                            )}
                          </div>
                          {!venue.published && (
                            <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded flex-shrink-0">
                              Draft
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
                          <div className="flex items-center space-x-4">
                            {venue.tz && (
                              <span title="Timezone">🕐 {venue.tz.split('/').pop()}</span>
                            )}
                            {venue.bbox && (
                              <span title="Boundary defined">✅ Mapped</span>
                            )}
                          </div>
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
              </>
            )}
          </div>

          {/* Right Side - Map */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
                <MapErrorBoundary>
                  <MapCanvas
                    zones={venues
                      .filter((v) => v.bbox && v.center_point?.coordinates)
                      .map((v) => ({
                        id: v.id,
                        layout_id: v.id,
                        name: v.name,
                        zone_type: 'other' as const, // Use 'other' since 'venue' isn't in Zone type
                        surface: 'grass',
                        color: selectedVenueId === v.id ? '#3b82f6' : '#10b981',
                        boundary: v.bbox,
                        rotation_deg: 0,
                        version_token: v.version_token || '',
                        created_at: v.created_at,
                        updated_at: v.updated_at,
                      }))}
                    center={getMapCenter()}
                    zoom={venues.length > 0 ? 11 : 13}
                    isLoading={false}
                    onPolygonCreate={async () => {}}
                    onPolygonUpdate={async () => {}}
                    onPolygonDelete={async () => {}}
                  />
                </MapErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

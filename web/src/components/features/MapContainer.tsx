'use client';

import React, { useEffect, useState } from 'react';
import { Map } from '@/components/map/Map';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchResults } from '@/components/search/SearchResults';
import { RateLimitWarning } from '@/components/search/RateLimitWarning';
import { LocationDisplay, type LocationData } from '@/components/search/LocationDisplay';
import { useSearch } from '@/hooks/useSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useTierFeatures } from '@/hooks/useTierFeatures';
import { useMap } from '@/hooks/useMap';
import type { Location } from '@/lib/validateSearch';

interface MapContainerProps {
  userTier?: 'free' | 'paid_individual' | 'club_admin' | 'admin';
  onLocationSelect?: (location: Location) => void;
  className?: string;
}

/**
 * MapContainer component - Full search and map integration
 * Combines SearchInput, Map, SearchResults, and LocationDisplay
 * Manages state for search, geolocation, and map interactions
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  userTier = 'free',
  onLocationSelect,
  className,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Custom hooks
  const { query, results, loading, error, rateLimit, cached, performSearch } =
    useSearch();
  const {
    latitude,
    longitude,
    accuracy,
    address,
    loading: geoLoading,
    error: geoError,
    supported: geoSupported,
    requestLocation,
    clearLocation,
  } = useGeolocation();
  const tierFeatures = useTierFeatures();
  const {
    mapRef,
    setCenter,
    addMarker,
    removeMarker,
    clearMarkers,
    fitBounds,
  } = useMap();

  // Update map when search results change
  useEffect(() => {
    if (results.length > 0) {
      clearMarkers();
      results.forEach((result, index) => {
        addMarker({
          id: `result-${index}`,
          lat: result.lat,
          lon: result.lon,
          label: result.address,
        });
      });

      // Fit map to show all results
      if (results.length > 1) {
        fitBounds({ padding: 50 });
      } else if (results.length === 1) {
        setCenter(results[0].lat, results[0].lon, { zoom: 15 });
      }
    }
  }, [results, clearMarkers, addMarker, fitBounds, setCenter]);

  // Update map when location changes
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      // Add current location marker
      addMarker({
        id: 'current-location',
        lat: latitude,
        lon: longitude,
        label: address || 'Your Location',
      });

      // Center map on location
      setCenter(latitude, longitude, { zoom: 14 });
    }
  }, [latitude, longitude, address, addMarker, setCenter]);

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setCenter(location.lat, location.lon, { zoom: 16 });

    // Add selected marker
    addMarker({
      id: 'selected',
      lat: location.lat,
      lon: location.lon,
      label: location.address,
    });

    onLocationSelect?.(location);
  };

  const handleSearch = (query: string) => {
    performSearch(query);
  };

  const handleClearLocation = () => {
    clearLocation();
    removeMarker('current-location');
  };

  const currentLocation: LocationData | null =
    latitude !== null && longitude !== null
      ? {
          latitude,
          longitude,
          accuracy: accuracy ?? undefined,
          address: address ?? undefined,
          timestamp: Date.now(),
        }
      : null;

  return (
    <div className={`flex flex-col gap-4 h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
        <span className="text-2xl">🗺️</span>
        <h1 className="text-xl font-bold text-gray-900">Search Locations</h1>
        <span className="ml-auto text-sm text-gray-500">
          {tierFeatures.canSearch ? '✓ Enabled' : '✗ Upgrade required'}
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex gap-4 overflow-hidden px-4 pb-4">
        {/* Left Sidebar - Search Controls */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto">
          {/* Search Input */}
          <SearchInput
            onSearch={handleSearch}
            onLocationClick={requestLocation}
            loading={loading}
            error={error ? (typeof error === 'string' ? error : error.message) : undefined}
            placeholder="Search for a location..."
            showLocationButton={geoSupported}
          />

          {/* Rate Limit Warning */}
          {rateLimit && (
            <RateLimitWarning
              remaining={rateLimit.remaining}
              limit={tierFeatures.searchesPerMinute}
              reset={rateLimit.reset}
              show={rateLimit.remaining <= Math.ceil(tierFeatures.searchesPerMinute * 0.2) || rateLimit.remaining === 0}
            />
          )}

          {/* Current Location Display */}
          {currentLocation && (
            <LocationDisplay
              location={currentLocation}
              onClear={handleClearLocation}
              loading={geoLoading}
              error={geoError ?? undefined}
            />
          )}

          {/* Search Results */}
          {(results.length > 0 || loading || error || cached) && (
            <SearchResults
              results={results}
              loading={loading}
              error={error ? (typeof error === 'string' ? error : error.message) : undefined}
              selectedLocation={selectedLocation}
              onSelectLocation={handleLocationSelect}
              userTier={userTier}
              cached={cached}
            />
          )}

          {/* No Results Message */}
          {!loading && query && results.length === 0 && !error && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-700">No locations found for "{query}"</p>
            </div>
          )}
        </div>

        {/* Right Side - Map */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg border border-gray-200">
          <Map
            center={selectedLocation ? { lat: selectedLocation.lat, lon: selectedLocation.lon } : undefined}
            zoom={15}
            markers={Object.entries({
              'current-location': latitude !== null && longitude !== null ? {
                id: 'current-location',
                lat: latitude,
                lon: longitude,
                title: 'Your Location',
              } : null,
              ...Object.fromEntries(
                results.map((result, idx) => [
                  `result-${idx}`,
                  {
                    id: `result-${idx}`,
                    lat: result.lat,
                    lon: result.lon,
                    title: result.address,
                  },
                ])
              ),
              selected: selectedLocation ? {
                id: 'selected',
                lat: selectedLocation.lat,
                lon: selectedLocation.lon,
                title: selectedLocation.address,
              } : null,
            }).filter(([_, v]) => v !== null).map(([_, v]) => v as any)}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <p>
          {selectedLocation
            ? `Selected: ${selectedLocation.address}`
            : results.length > 0
              ? `${results.length} results found`
              : 'Ready to search'}
        </p>
      </div>
    </div>
  );
};

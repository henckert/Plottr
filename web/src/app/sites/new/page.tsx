'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCreateSite, useGeocode, type GeoPoint, type GeoPolygon } from '@/hooks/useSites';
import SiteLocationMap from '@/components/map/SiteLocationMap';

export default function CreateSitePage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [location, setLocation] = useState<GeoPoint | undefined>({
    type: 'Point',
    coordinates: [-7.6991, 52.3611], // Default: Clonmel, Ireland
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [bbox, setBbox] = useState<GeoPolygon | undefined>(undefined); // TODO: Implement boundary drawing

  // UI state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [geocodeCandidates, setGeocodeCandidates] = useState<any[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);

  const createSiteMutation = useCreateSite();
  const geocodeMutation = useGeocode();

  // Helper to get country ISO code from country name
  const getCountryCode = (countryName: string): string | undefined => {
    const countryMap: Record<string, string> = {
      'Ireland': 'ie',
      'United Kingdom': 'gb',
      'UK': 'gb',
      'United States': 'us',
      'USA': 'us',
    };
    return countryMap[countryName];
  };

  // Handle map marker drag
  const handleLocationChange = (lat: number, lng: number) => {
    setLocation({
      type: 'Point',
      coordinates: [lng, lat],
    });
  };

  // Geocode address
  const handleGeocodeAddress = async () => {
    if (!address.trim()) return;

    setIsGeocoding(true);
    setGeocodeError(null);
    setShowCandidates(false);

    try {
      const countryCode = country ? getCountryCode(country) : undefined;
      const result = await geocodeMutation.mutateAsync({ 
        query: address,
        countryCode 
      });
      
      if (result.features && result.features.length > 0) {
        if (result.features.length === 1) {
          // Only one result, apply it directly
          selectGeocodeResult(result.features[0]);
        } else {
          // Multiple results, show picker
          setGeocodeCandidates(result.features);
          setShowCandidates(true);
        }
      } else {
        setGeocodeError('No results found for this address');
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      setGeocodeError('Failed to geocode address. Please try again or adjust the marker manually.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Select a geocode result from candidates
  const selectGeocodeResult = (feature: any) => {
    const newLocation: GeoPoint = {
      type: 'Point',
      coordinates: feature.center,
    };

    setLocation(newLocation);

    // Parse context from Nominatim geocoding result
    if (feature.context && feature.context.length > 0) {
      const locality = feature.context.find((c: any) => c.id === 'locality')?.text || '';
      const region = feature.context.find((c: any) => c.id === 'region')?.text || '';
      const postcode = feature.context.find((c: any) => c.id === 'postcode')?.text || '';
      const countryName = feature.context.find((c: any) => c.id === 'country')?.text || '';

      setCity(locality);
      setState(region);
      setPostalCode(postcode);
      setCountry(countryName);
    }

    setShowCandidates(false);
    setGeocodeCandidates([]);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Site name is required');
      return;
    }

    try {
      const newSite = await createSiteMutation.mutateAsync({
        club_id: 1, // TODO: Get from auth context
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        location,
        bbox,
      });

      router.push(`/sites/${newSite.id}`);
    } catch (error: any) {
      console.error('Failed to create site:', error);
      alert(error.response?.data?.error?.message || 'Failed to create site');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/sites"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sites
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Site</h1>
        <p className="text-gray-600 mt-1">
          Add a new sports facility or field location
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Site Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Site Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Golden Gate Park Fields"
            required
            maxLength={200}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., Whitehorns, Clonmel or Eircode E91 VF83"
              maxLength={500}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleGeocodeAddress}
              disabled={!address.trim() || isGeocoding}
              aria-label="Search for address"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  Go
                </>
              )}
            </button>
          </div>
          
          {/* Geocode Results Picker */}
          {showCandidates && geocodeCandidates.length > 0 && (
            <div className="mt-2 border border-gray-300 rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
              <div className="p-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
                Select a location ({geocodeCandidates.length} found):
              </div>
              {geocodeCandidates.map((candidate, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectGeocodeResult(candidate)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-gray-900 text-sm">
                    {candidate.place_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {candidate.center[1].toFixed(5)}°, {candidate.center[0].toFixed(5)}°
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {geocodeError && (
            <p className="text-red-600 text-sm mt-1">{geocodeError}</p>
          )}
          <p className="text-gray-500 text-sm mt-1">
            Enter an address or Eircode and click Go to find locations
          </p>
        </div>

        {/* City, State, Country */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="San Francisco"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
              State/Province
            </label>
            <input
              type="text"
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="California"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United States"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Postal Code */}
        <div className="max-w-xs">
          <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            id="postal_code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="94102"
            maxLength={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Map */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <div className="w-full h-96">
            <SiteLocationMap
              lat={location?.coordinates[1] ?? 52.3611}
              lng={location?.coordinates[0] ?? -7.6991}
              onChange={handleLocationChange}
            />
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Drag the marker to adjust the exact location
            {location && (
              <span className="ml-2 text-gray-700">
                ({location.coordinates[1].toFixed(6)}°, {location.coordinates[0].toFixed(6)}°)
              </span>
            )}
          </p>
        </div>

        {/* TODO: Add boundary drawing in Phase 2 */}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <Link
            href="/sites"
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createSiteMutation.isPending || !name.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createSiteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Site'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

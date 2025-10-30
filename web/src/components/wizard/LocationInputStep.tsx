'use client';

import { useState } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface LocationInputStepProps {
  location: { lat: number; lng: number } | null;
  address: string;
  onAddressChange: (address: string) => void;
  onLocationSet: (location: { lat: number; lng: number }, address: string) => void;
  onSkip: () => void;
  onOpenMapPicker: () => void;
}

export default function LocationInputStep({
  location,
  address,
  onAddressChange,
  onLocationSet,
  onSkip,
  onOpenMapPicker,
}: LocationInputStepProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const handleGeocode = async () => {
    if (!address.trim()) {
      setGeocodeError('Please enter an address or Eircode');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      // Call geocoding API
      const response = await fetch(
        `/api/geocode/search?q=${encodeURIComponent(address)}&limit=1&country=ie`
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        onLocationSet(
          { lat: result.lat, lng: result.lng },
          result.displayName || address
        );
      } else {
        setGeocodeError('Location not found. Try a different address or Eircode.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeError('Failed to find location. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGeocode();
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Where is this located?
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Enter an address or Eircode to center the map on your site
      </p>

      {/* Address/Eircode Input */}
      <div className="space-y-4">
        <div>
          <label htmlFor="address-input" className="block text-sm font-medium text-gray-700 mb-2">
            Address or Eircode
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="address-input"
                type="text"
                value={address}
                onChange={(e) => {
                  onAddressChange(e.target.value);
                  setGeocodeError(null);
                }}
                onKeyPress={handleKeyPress}
                placeholder="e.g., E91 VF83 or Main Street, Cork"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGeocoding}
              />
            </div>
            <button
              onClick={handleGeocode}
              disabled={isGeocoding || !address.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isGeocoding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Go'
              )}
            </button>
          </div>
          {geocodeError && (
            <p className="mt-2 text-sm text-red-600">{geocodeError}</p>
          )}
          {location && (
            <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Location set: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Pick on Map Button */}
        <button
          onClick={onOpenMapPicker}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
        >
          <MapPin className="w-5 h-5" />
          Pick on Map
        </button>

        {/* Skip Link */}
        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Skip for now
          </button>
        </div>

        {/* Helper Text */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>Tip:</strong> Eircode format: 3 letters/numbers + space + 4 letters/numbers
            (e.g., E91 VF83). Works for Irish addresses only.
          </p>
        </div>
      </div>
    </div>
  );
}

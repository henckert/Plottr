'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin } from 'lucide-react';

// Dynamically import map to avoid SSR issues
const DynamicMap = dynamic(() => import('./MapPickerMap'), { ssr: false });

interface MapPickerModalProps {
  onClose: () => void;
  onConfirm: (location: { lat: number; lng: number }) => void;
  initialLocation?: { lat: number; lng: number };
}

export default function MapPickerModal({
  onClose,
  onConfirm,
  initialLocation,
}: MapPickerModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>(
    initialLocation || { lat: 53.3498, lng: -6.2603 } // Dublin default
  );

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleConfirm = () => {
    onConfirm(selectedLocation);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Pick Location on Map</h3>
            <p className="text-sm text-gray-500 mt-1">
              Click anywhere on the map to set your location
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <DynamicMap
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
          />

          {/* Crosshair indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <MapPin className="w-8 h-8 text-blue-600 drop-shadow-lg" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <strong>Selected:</strong>{' '}
              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

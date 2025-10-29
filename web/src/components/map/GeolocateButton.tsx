'use client';

import { useState } from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import type { Map as MapLibreMap } from 'maplibre-gl';

interface GeolocateButtonProps {
  map: MapLibreMap | null;
  onLocationFound?: (lat: number, lon: number) => void;
  onError?: (error: string) => void;
}

export function GeolocateButton({ map, onLocationFound, onError }: GeolocateButtonProps) {
  const [isLocating, setIsLocating] = useState(false);

  const handleGeolocate = () => {
    if (!map) {
      onError?.('Map not initialized');
      return;
    }

    if (!navigator.geolocation) {
      onError?.('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Center map on user's location
        map.flyTo({
          center: [longitude, latitude],
          zoom: 16,
          duration: 1500,
        });

        // Add or update user location marker
        const existingMarker = (map as any)._userLocationMarker;
        if (existingMarker) {
          existingMarker.setLngLat([longitude, latitude]);
        } else {
          // Create a pulsing dot marker
          const el = document.createElement('div');
          el.className = 'user-location-marker';
          el.innerHTML = `
            <div class="pulse-outer"></div>
            <div class="pulse-inner"></div>
          `;
          
          const maplibregl = require('maplibre-gl');
          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat([longitude, latitude])
            .addTo(map);
          
          (map as any)._userLocationMarker = marker;
        }

        setIsLocating(false);
        onLocationFound?.(latitude, longitude);
      },
      (error) => {
        setIsLocating(false);
        let message = 'Could not get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += 'You denied location access. You can still search or drop a pin.';
            break;
          case error.POSITION_UNAVAILABLE:
            message += 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            message += 'Location request timed out.';
            break;
          default:
            message += 'An unknown error occurred.';
        }
        
        onError?.(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  return (
    <>
      <button
        onClick={handleGeolocate}
        disabled={isLocating || !map}
        className="bg-white rounded-lg shadow-md p-2.5 hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="My Location"
      >
        {isLocating ? (
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        ) : (
          <Navigation className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Pulsing marker styles */}
      <style jsx global>{`
        .user-location-marker {
          width: 24px;
          height: 24px;
          position: relative;
        }

        .pulse-outer {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .pulse-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }

        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}

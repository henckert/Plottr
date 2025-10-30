'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapPickerMapProps {
  selectedLocation: { lat: number; lng: number };
  onLocationChange: (location: { lat: number; lng: number }) => void;
}

export default function MapPickerMap({
  selectedLocation,
  onLocationChange,
}: MapPickerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [selectedLocation.lng, selectedLocation.lat],
      zoom: 14,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Update location on map click
    map.current.on('click', (e) => {
      onLocationChange({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      });
    });

    // Update location on map drag/zoom (center follows)
    const updateCenter = () => {
      if (map.current) {
        const center = map.current.getCenter();
        onLocationChange({
          lat: center.lat,
          lng: center.lng,
        });
      }
    };

    map.current.on('move', updateCenter);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map center when selectedLocation changes externally
  useEffect(() => {
    if (map.current) {
      const currentCenter = map.current.getCenter();
      const distance = Math.sqrt(
        Math.pow(currentCenter.lat - selectedLocation.lat, 2) +
        Math.pow(currentCenter.lng - selectedLocation.lng, 2)
      );

      // Only fly to new location if it's significantly different (avoid feedback loop)
      if (distance > 0.0001) {
        map.current.flyTo({
          center: [selectedLocation.lng, selectedLocation.lat],
          duration: 1000,
        });
      }
    }
  }, [selectedLocation]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}

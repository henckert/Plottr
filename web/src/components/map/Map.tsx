'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MaplibreMap, Marker } from 'maplibre-gl';

interface MapProps {
  center?: { lat: number; lon: number };
  zoom?: number;
  className?: string;
  onMarkerClick?: (marker: any) => void;
  markers?: Array<{
    id: string;
    lat: number;
    lon: number;
    title: string;
    color?: string;
  }>;
}

export const Map = React.forwardRef<MaplibreMap, MapProps>(
  (
    {
      center = { lat: 0, lon: 0 },
      zoom = 2,
      className = '',
      onMarkerClick,
      markers = [],
    },
    ref
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<MaplibreMap | null>(null);
    const markersRef = useRef<Record<string, Marker>>({});

    // Initialize map
    useEffect(() => {
      if (!mapContainer.current || map.current) return;

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style:
          'https://demotiles.maplibre.org/style.json', // OSM-compatible style
        center: [center.lon, center.lat],
        zoom: zoom,
      });

      // Forward ref
      if (ref) {
        if (typeof ref === 'function') {
          ref(map.current);
        } else {
          ref.current = map.current;
        }
      }

      return () => {
        map.current?.remove();
        map.current = null;
      };
    }, [ref]);

    // Update markers
    useEffect(() => {
      if (!map.current) return;

      // Remove old markers
      Object.values(markersRef.current).forEach((marker) => {
        marker.remove();
      });
      markersRef.current = {};

      // Add new markers
      markers.forEach((markerData) => {
        const marker = new maplibregl.Marker({
          color: markerData.color || '#3B82F6',
        })
          .setLngLat([markerData.lon, markerData.lat])
          .addTo(map.current!)
          .setPopup(
            new maplibregl.Popup().setText(markerData.title)
          );

        marker.getElement().addEventListener('click', () => {
          onMarkerClick?.(markerData);
        });

        markersRef.current[markerData.id] = marker;
      });
    }, [markers, onMarkerClick]);

    return (
      <div
        ref={mapContainer}
        className={`w-full h-full bg-gray-200 ${className}`}
        style={{ minHeight: '400px' }}
      />
    );
  }
);

Map.displayName = 'Map';

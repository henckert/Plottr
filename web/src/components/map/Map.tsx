'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MaplibreMap, Marker } from 'maplibre-gl';

export interface MapProps {
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

      // Get MapTiler API key for satellite basemap
      const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      const satelliteStyle = mapTilerKey
        ? `https://api.maptiler.com/maps/satellite/style.json?key=${mapTilerKey}`
        : 'https://demotiles.maplibre.org/style.json'; // Fallback

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: satelliteStyle,
        center: [center.lon, center.lat],
        zoom: zoom,
        attributionControl: false, // We'll add custom attribution
        pitchWithRotate: true,
        dragRotate: true,
      });

      // Add navigation controls (zoom, compass, pitch)
      const navControl = new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      });
      map.current.addControl(navControl, 'top-right');

      // Add scale control for measurements
      const scaleControl = new maplibregl.ScaleControl({
        maxWidth: 200,
        unit: 'metric',
      });
      map.current.addControl(scaleControl, 'bottom-left');

      // Add attribution
      const attributionControl = new maplibregl.AttributionControl({
        compact: true,
      });
      map.current.addControl(attributionControl, 'bottom-right');

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

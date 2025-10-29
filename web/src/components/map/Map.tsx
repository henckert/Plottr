'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MaplibreMap, Marker } from 'maplibre-gl';
import { MapStyleSwitcher } from './MapStyleSwitcher';
import { GeolocateButton } from './GeolocateButton';
import { OverlayToggles } from './OverlayToggles';
import GeocodeSearch from './GeocodeSearch';
import { MapStyle, getStyleUrl } from '@/lib/mapStyles';

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
  showStyleSwitcher?: boolean;
  showGeolocate?: boolean;
  showOverlays?: boolean;
  showGeocodeSearch?: boolean;
}

export const Map = React.forwardRef<MaplibreMap, MapProps>(
  (
    {
      center = { lat: 53.3498, lon: -6.2603 }, // Default to Dublin
      zoom = 6,
      className = '',
      onMarkerClick,
      markers = [],
      showStyleSwitcher = true,
      showGeolocate = true,
      showOverlays = true,
      showGeocodeSearch = true,
    },
    ref
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<MaplibreMap | null>(null);
    const markersRef = useRef<Record<string, Marker>>({});
    const [currentStyle, setCurrentStyle] = useState<MapStyle>('osm-bright');
    const [overlays, setOverlays] = useState({
      buildings: false,
      pitches: false,
      parking: false,
    });

    // --- START: forced raster fallback style ---
    const FALLBACK_OSM_STYLE: any = {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors"
        }
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }]
    };
    // --- END: forced raster fallback style ---

    // Initialize map
    useEffect(() => {
      if (!mapContainer.current || map.current) return;

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: FALLBACK_OSM_STYLE,
        center: [center.lon, center.lat],
        zoom: zoom,
        attributionControl: false, // We'll add custom attribution
        pitchWithRotate: true,
        dragRotate: true,
      });

      // Add diagnostics
      map.current.on('load', () => console.log('[Map] load'));
      map.current.on('styledata', () => console.log('[Map] styledata', map.current?.getStyle()?.name));
      map.current.on('error', (e: any) => console.warn('[Map] error', e?.error || e));

      // Switch to vector style after initial load
      map.current.once('load', () => {
        console.log('[Map] Switching to vector style...');
        try {
          map.current?.setStyle('/styles/osm-liberty.json?v=1');
        } catch (err) {
          console.warn('[Map] Failed to load vector style, keeping raster fallback', err);
        }
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

    // Handle style changes
    useEffect(() => {
      if (!map.current) return;
      map.current.setStyle(getStyleUrl(currentStyle));
    }, [currentStyle]);

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

    const handleOverlayToggle = (layer: keyof typeof overlays) => {
      setOverlays((prev) => ({ ...prev, [layer]: !prev[layer] }));
    };

    return (
      <div className={`relative w-full h-full ${className}`}>
        <div
          ref={mapContainer}
          className="w-full h-full min-h-[520px] bg-gray-200"
        />

        {/* Geocode search bar */}
        {showGeocodeSearch && (
          <div className="absolute top-4 left-4 z-20">
            <GeocodeSearch
              map={map.current}
              onLocationSelected={(result) => {
                console.log('Location selected:', result);
              }}
            />
          </div>
        )}

        {/* Map controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          {showStyleSwitcher && (
            <MapStyleSwitcher
              currentStyle={currentStyle}
              onStyleChange={setCurrentStyle}
            />
          )}
          {showOverlays && (
            <OverlayToggles overlays={overlays} onToggle={handleOverlayToggle} />
          )}
        </div>

        {showGeolocate && (
          <div className="absolute bottom-24 right-4 z-10">
            <GeolocateButton
              map={map.current}
              onLocationFound={(coords) => {
                console.log('User location:', coords);
              }}
              onError={(error) => {
                console.error('Geolocation error:', error);
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

Map.displayName = 'Map';

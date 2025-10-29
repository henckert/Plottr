'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Zone {
  id: number;
  name: string;
  zone_type: string;
  boundary: any; // GeoJSON Polygon
  color?: string;
}

interface Asset {
  id: number;
  name: string;
  asset_type: string;
  icon?: string;
  geometry: any; // GeoJSON Point or LineString
}

interface Props {
  zones: Zone[];
  assets: Asset[];
}

export default function PublicLayoutMap({ zones, assets }: Props) {
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
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [-122.4194, 37.7749], // Default to San Francisco
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(
      new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }),
      'bottom-left'
    );

    // Wait for map to load before adding layers
    map.current.on('load', () => {
      if (!map.current) return;

      // Add zones as GeoJSON source
      if (zones.length > 0) {
        const zonesFeatureCollection = {
          type: 'FeatureCollection' as const,
          features: zones.map((zone) => ({
            type: 'Feature' as const,
            id: zone.id,
            properties: {
              id: zone.id,
              name: zone.name,
              zone_type: zone.zone_type,
              color: zone.color || '#3b82f6',
            },
            geometry: zone.boundary,
          })),
        };

        map.current!.addSource('zones', {
          type: 'geojson',
          data: zonesFeatureCollection,
        });

        // Add fill layer
        map.current!.addLayer({
          id: 'zones-fill',
          type: 'fill',
          source: 'zones',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.4,
          },
        });

        // Add outline layer
        map.current!.addLayer({
          id: 'zones-outline',
          type: 'line',
          source: 'zones',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
          },
        });

        // Add labels
        map.current!.addLayer({
          id: 'zones-labels',
          type: 'symbol',
          source: 'zones',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 12,
            'text-anchor': 'center',
          },
          paint: {
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        });

        // Fit map to zones bounds
        const coordinates = zones.flatMap((zone) =>
          zone.boundary.coordinates[0].map((coord: number[]) => coord as [number, number])
        );

        if (coordinates.length > 0) {
          const bounds = coordinates.reduce(
            (bounds, coord) => bounds.extend(coord),
            new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
          );

          map.current!.fitBounds(bounds, {
            padding: 50,
            maxZoom: 17,
          });
        }
      }

      // Add assets as GeoJSON source
      if (assets.length > 0) {
        const assetsFeatureCollection = {
          type: 'FeatureCollection' as const,
          features: assets.map((asset) => ({
            type: 'Feature' as const,
            id: asset.id,
            properties: {
              id: asset.id,
              name: asset.name,
              asset_type: asset.asset_type,
              icon: asset.icon,
            },
            geometry: asset.geometry,
          })),
        };

        map.current!.addSource('assets', {
          type: 'geojson',
          data: assetsFeatureCollection,
        });

        // Add point assets
        map.current!.addLayer({
          id: 'assets-points',
          type: 'circle',
          source: 'assets',
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': 8,
            'circle-color': '#ef4444',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });

        // Add line assets
        map.current!.addLayer({
          id: 'assets-lines',
          type: 'line',
          source: 'assets',
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: {
            'line-color': '#ef4444',
            'line-width': 3,
          },
        });

        // Add asset labels
        map.current!.addLayer({
          id: 'assets-labels',
          type: 'symbol',
          source: 'assets',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-anchor': 'top',
            'text-offset': [0, 1],
          },
          paint: {
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        });
      }

      // Add popup on zone click
      map.current!.on('click', 'zones-fill', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const { name, zone_type } = feature.properties as {
          name: string;
          zone_type: string;
        };

        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `
            <div style="padding: 8px;">
              <h3 style="font-weight: 600; margin-bottom: 4px;">${name}</h3>
              <p style="font-size: 12px; color: #6b7280; text-transform: capitalize;">
                ${zone_type.replace(/_/g, ' ')}
              </p>
            </div>
            `
          )
          .addTo(map.current!);
      });

      // Add popup on asset click
      map.current!.on('click', 'assets-points', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const { name, asset_type } = feature.properties as {
          name: string;
          asset_type: string;
        };

        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `
            <div style="padding: 8px;">
              <h3 style="font-weight: 600; margin-bottom: 4px;">${name}</h3>
              <p style="font-size: 12px; color: #6b7280; text-transform: capitalize;">
                ${asset_type.replace(/_/g, ' ')}
              </p>
            </div>
            `
          )
          .addTo(map.current!);
      });

      // Change cursor on hover
      map.current!.on('mouseenter', 'zones-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current!.on('mouseleave', 'zones-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

      map.current!.on('mouseenter', 'assets-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current!.on('mouseleave', 'assets-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [zones, assets]);

  return <div ref={mapContainer} className="w-full h-full" />;
}

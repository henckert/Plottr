'use client';

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import type { Feature, Polygon, LineString, Point } from 'geojson';

export interface MeasurementsDisplayProps {
  /**
   * GeoJSON feature to measure
   */
  feature: Feature | null;
  
  /**
   * Unit system for measurements
   * @default 'metric'
   */
  unit?: 'metric' | 'imperial';
  
  /**
   * CSS class for container
   */
  className?: string;
  
  /**
   * Show/hide the measurements panel
   * @default true
   */
  visible?: boolean;
}

interface Measurements {
  area?: string;
  perimeter?: string;
  length?: string;
  vertices?: number;
}

/**
 * Real-time measurements display for drawn features
 * 
 * Calculates and displays:
 * - Polygon area (m² or acres)
 * - Polygon perimeter (m or ft)
 * - Line length (m or ft)
 * - Vertex count
 * 
 * Uses Turf.js for accurate geospatial calculations.
 * 
 * @example
 * ```tsx
 * <MeasurementsDisplay
 *   feature={currentFeature}
 *   unit="metric"
 * />
 * ```
 */
export function MeasurementsDisplay({
  feature,
  unit = 'metric',
  className = '',
  visible = true,
}: MeasurementsDisplayProps) {
  const measurements = useMemo<Measurements | null>(() => {
    if (!feature || !feature.geometry) return null;

    try {
      switch (feature.geometry.type) {
        case 'Polygon': {
          const polygon = feature as Feature<Polygon>;
          
          // Calculate area using Turf.js (returns m²)
          const areaInSquareMeters = turf.area(polygon);
          
          // Calculate perimeter by converting polygon to line
          const line = turf.polygonToLine(polygon);
          const perimeterInMeters = line 
            ? turf.length(line, { units: 'meters' }) * 1000 
            : 0;
          
          // Count vertices (exclude closing vertex)
          const coordinates = polygon.geometry.coordinates[0];
          const vertexCount = coordinates.length - 1;

          // Format based on unit system
          const area = unit === 'metric'
            ? areaInSquareMeters >= 10000
              ? `${(areaInSquareMeters / 10000).toFixed(2)} ha` // hectares for large areas
              : `${areaInSquareMeters.toFixed(2)} m²`
            : areaInSquareMeters >= 4046.86 // 1 acre
              ? `${(areaInSquareMeters * 0.000247105).toFixed(2)} acres`
              : `${(areaInSquareMeters * 10.7639).toFixed(2)} ft²`;

          const perimeter = unit === 'metric'
            ? perimeterInMeters >= 1000
              ? `${(perimeterInMeters / 1000).toFixed(2)} km`
              : `${perimeterInMeters.toFixed(2)} m`
            : perimeterInMeters >= 304.8 // 1000 feet
              ? `${(perimeterInMeters * 3.28084 / 5280).toFixed(2)} mi`
              : `${(perimeterInMeters * 3.28084).toFixed(2)} ft`;

          return {
            area,
            perimeter,
            vertices: vertexCount,
          };
        }

        case 'LineString': {
          const lineString = feature as Feature<LineString>;
          
          // Calculate length using Turf.js (returns kilometers by default)
          const lengthInMeters = turf.length(lineString, { units: 'meters' }) * 1000;
          
          // Count vertices
          const vertexCount = lineString.geometry.coordinates.length;

          const length = unit === 'metric'
            ? lengthInMeters >= 1000
              ? `${(lengthInMeters / 1000).toFixed(2)} km`
              : `${lengthInMeters.toFixed(2)} m`
            : lengthInMeters >= 304.8
              ? `${(lengthInMeters * 3.28084 / 5280).toFixed(2)} mi`
              : `${(lengthInMeters * 3.28084).toFixed(2)} ft`;

          return {
            length,
            vertices: vertexCount,
          };
        }

        case 'Point': {
          // Points don't have measurements, but we can show coordinates
          const point = feature as Feature<Point>;
          const [lng, lat] = point.geometry.coordinates;
          
          return {
            area: `Lat: ${lat.toFixed(6)}°`,
            perimeter: `Lng: ${lng.toFixed(6)}°`,
          };
        }

        default:
          return null;
      }
    } catch (error) {
      console.error('Error calculating measurements:', error);
      return null;
    }
  }, [feature, unit]);

  if (!visible || !measurements) return null;

  return (
    <div className={`absolute top-20 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[220px] z-10 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Measurements</h3>
        <span className="text-xs text-gray-500 uppercase">{unit}</span>
      </div>
      
      <div className="space-y-2">
        {measurements.area && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {feature?.geometry.type === 'Point' ? 'Latitude' : 'Area'}:
            </span>
            <span className="text-sm font-medium text-gray-900">
              {measurements.area}
            </span>
          </div>
        )}
        
        {measurements.perimeter && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {feature?.geometry.type === 'Point' ? 'Longitude' : 'Perimeter'}:
            </span>
            <span className="text-sm font-medium text-gray-900">
              {measurements.perimeter}
            </span>
          </div>
        )}
        
        {measurements.length && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Length:</span>
            <span className="text-sm font-medium text-gray-900">
              {measurements.length}
            </span>
          </div>
        )}
        
        {measurements.vertices !== undefined && measurements.vertices > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-500">Vertices:</span>
            <span className="text-xs font-medium text-gray-700">
              {measurements.vertices}
            </span>
          </div>
        )}
      </div>
      
      {/* Unit toggle */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          {unit === 'metric' ? 'm² / m / ha' : 'ft² / ft / acres'}
        </div>
      </div>
    </div>
  );
}

/**
 * Utility function to convert measurements between units
 */
export function convertMeasurement(value: number, from: string, to: string): number {
  const conversions: Record<string, Record<string, number>> = {
    // Area conversions
    'm²': {
      'ft²': 10.7639,
      'acres': 0.000247105,
      'ha': 0.0001,
    },
    'ft²': {
      'm²': 0.092903,
      'acres': 0.0000229568,
    },
    // Length conversions
    'm': {
      'ft': 3.28084,
      'mi': 0.000621371,
      'km': 0.001,
    },
    'ft': {
      'm': 0.3048,
      'mi': 0.000189394,
    },
  };

  if (from === to) return value;
  if (!conversions[from] || !conversions[from][to]) {
    console.warn(`No conversion from ${from} to ${to}`);
    return value;
  }

  return value * conversions[from][to];
}

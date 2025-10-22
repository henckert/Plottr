'use client';

import { memo } from 'react';
import { MapCanvas } from './MapCanvas';
import type { components } from '@/types/api';

type Zone = components['schemas']['Zone'];

interface MapCanvasWrapperProps {
  zones: Zone[];
  selectedZoneId?: number | null;
  onZoneClick?: (zoneId: number) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
  isLoading?: boolean;
}

// Memoize the component to prevent unnecessary re-renders
export const MapCanvasWrapper = memo(function MapCanvasWrapper(props: MapCanvasWrapperProps) {
  return <MapCanvas {...props} />;
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these change
  return (
    prevProps.zones === nextProps.zones &&
    prevProps.selectedZoneId === nextProps.selectedZoneId &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.center === nextProps.center &&
    prevProps.zoom === nextProps.zoom
  );
});

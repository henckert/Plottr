/**
 * Map components for drawing and editing field layouts
 * 
 * Core Components:
 * - Map: MapLibre GL container with satellite basemap
 * - DrawingToolbar: Tools for drawing zones, assets, and boundaries
 * - GridOverlay: Snap-to-grid functionality
 * - MeasurementsDisplay: Real-time area/perimeter calculations
 * 
 * @example
 * ```tsx
 * import { Map, DrawingToolbar, GridOverlay, MeasurementsDisplay } from '@/components/map';
 * 
 * function LayoutEditor() {
 *   const [map, setMap] = useState<MaplibreMap | null>(null);
 *   const [feature, setFeature] = useState<Feature | null>(null);
 *   
 *   return (
 *     <Map onLoad={setMap}>
 *       <DrawingToolbar
 *         map={map}
 *         onFeatureCreated={setFeature}
 *       />
 *       <GridOverlay map={map} gridSize={10} enabled={true} />
 *       <MeasurementsDisplay feature={feature} unit="metric" />
 *     </Map>
 *   );
 * }
 * ```
 */

export { Map } from './Map';
export type { MapProps } from './Map';

export { DrawingToolbar } from './DrawingToolbar';
export type { DrawingToolbarProps } from './DrawingToolbar';

export { GridOverlay, snapToGrid, snapPolygonToGrid, snapLineStringToGrid } from './GridOverlay';
export type { GridOverlayProps } from './GridOverlay';

export { MeasurementsDisplay, convertMeasurement } from './MeasurementsDisplay';
export type { MeasurementsDisplayProps } from './MeasurementsDisplay';

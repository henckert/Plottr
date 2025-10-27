# TASK 4.1-4.5: MapLibre Drawing Tools - Planning Document

**Created:** October 27, 2025  
**Status:** Planning → Implementation  
**Estimated LOC:** 400-600 lines  
**Estimated Time:** 3-4 hours  

---

## Overview

Implement the core map and drawing functionality for the Plottr field layout designer using MapLibre GL JS. This includes satellite basemap rendering, polygon/point/line drawing tools, snap-to-grid, vertex editing, and real-time area/perimeter measurements.

---

## Architecture

### Component Hierarchy
```
LayoutEditor (parent page)
├── MapProvider (context)
│   └── Map (MapLibre GL container)
│       ├── DrawingToolbar (tool selection)
│       ├── GridOverlay (snap-to-grid)
│       ├── MeasurementsDisplay (area/perimeter)
│       ├── ZonesLayer (existing zones)
│       └── AssetsLayer (existing assets)
```

### Dependencies to Install
```json
{
  "maplibre-gl": "^4.0.0",
  "@maplibre/maplibre-gl-draw": "^1.0.0",
  "@turf/area": "^7.0.0",
  "@turf/length": "^7.0.0",
  "@turf/distance": "^7.0.0",
  "@types/maplibre-gl": "^4.0.0"
}
```

**Note:** MapLibre GL Draw is a fork of Mapbox GL Draw that works with MapLibre. If not available, we'll use `mapbox-gl-draw` with MapLibre (they're compatible).

---

## TASK 4.1: MapLibre Setup

### File: `web/src/components/map/Map.tsx`
**Estimated LOC:** 120-150 lines

**Purpose:** Core MapLibre GL container component with satellite basemap and basic controls.

**Implementation:**
```typescript
// Map.tsx - Skeleton
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  style?: string; // Basemap style URL
  onLoad?: (map: maplibregl.Map) => void;
  children?: React.ReactNode;
}

export function Map({ center, zoom, style, onLoad, children }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize MapLibre GL
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: style || 'https://api.maptiler.com/maps/satellite/style.json?key=YOUR_KEY',
      center: center || [-74.5, 40], // Default to NYC area
      zoom: zoom || 9,
      attributionControl: false,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    // Notify parent when map loads
    map.current.on('load', () => {
      if (onLoad && map.current) {
        onLoad(map.current);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {children}
    </div>
  );
}
```

**Features:**
- MapLibre GL initialization with satellite basemap
- Navigation controls (zoom, rotate, pitch)
- Scale control for measurements
- Ref management for map instance
- Cleanup on unmount

**Basemap Options:**
1. **MapTiler Satellite** (Recommended): `https://api.maptiler.com/maps/satellite/style.json?key={MAPTILER_KEY}`
2. **Mapbox Satellite**: `mapbox://styles/mapbox/satellite-v9` (requires Mapbox token)
3. **OpenStreetMap**: Free but no satellite imagery

**Environment Variable:**
```env
NEXT_PUBLIC_MAPTILER_KEY=get_from_maptiler_com
```

---

## TASK 4.2: MapLibre Draw Integration

### File: `web/src/components/map/DrawingToolbar.tsx`
**Estimated LOC:** 100-120 lines

**Purpose:** Toolbar for selecting drawing modes (polygon, point, line, select, delete).

**Implementation:**
```typescript
// DrawingToolbar.tsx - Skeleton
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface DrawingToolbarProps {
  map: maplibregl.Map | null;
  onFeatureCreated?: (feature: GeoJSON.Feature) => void;
  onFeatureUpdated?: (feature: GeoJSON.Feature) => void;
  onFeatureDeleted?: (featureId: string) => void;
}

export function DrawingToolbar({ map, onFeatureCreated, onFeatureUpdated, onFeatureDeleted }: DrawingToolbarProps) {
  const draw = useRef<MapboxDraw | null>(null);

  useEffect(() => {
    if (!map) return;

    // Initialize MapboxDraw (works with MapLibre)
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        point: true,
        line_string: true,
        trash: true,
      },
      styles: [
        // Custom styling for zones (blue) vs assets (orange)
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.3,
          },
        },
        // ... more styles
      ],
    });

    map.addControl(draw.current, 'top-left');

    // Event handlers
    map.on('draw.create', (e) => {
      if (onFeatureCreated && e.features[0]) {
        onFeatureCreated(e.features[0]);
      }
    });

    map.on('draw.update', (e) => {
      if (onFeatureUpdated && e.features[0]) {
        onFeatureUpdated(e.features[0]);
      }
    });

    map.on('draw.delete', (e) => {
      if (onFeatureDeleted && e.features[0]) {
        onFeatureDeleted(e.features[0].id as string);
      }
    });

    return () => {
      if (draw.current && map) {
        map.removeControl(draw.current);
      }
    };
  }, [map]);

  return (
    <div className="absolute top-4 left-20 bg-white rounded-lg shadow-md p-2 flex gap-2">
      <button onClick={() => draw.current?.changeMode('draw_polygon')} className="...">
        Draw Zone
      </button>
      <button onClick={() => draw.current?.changeMode('draw_point')} className="...">
        Place Asset
      </button>
      <button onClick={() => draw.current?.changeMode('draw_line_string')} className="...">
        Draw Line
      </button>
      <button onClick={() => draw.current?.changeMode('simple_select')} className="...">
        Select
      </button>
    </div>
  );
}
```

**Features:**
- Polygon tool for zones
- Point tool for assets
- Line tool for boundaries/fences
- Select mode for editing
- Delete mode with trash button
- Custom styling for different feature types

**Draw Modes:**
- `draw_polygon` - Draw closed polygons (zones)
- `draw_point` - Place individual points (assets)
- `draw_line_string` - Draw lines (fences, boundaries)
- `simple_select` - Select and edit existing features
- `direct_select` - Edit vertices directly

---

## TASK 4.3: Snap-to-Grid Feature

### File: `web/src/components/map/GridOverlay.tsx`
**Estimated LOC:** 80-100 lines

**Purpose:** Render a grid overlay on the map and snap vertices to grid intersections during drawing.

**Implementation:**
```typescript
// GridOverlay.tsx - Skeleton
interface GridOverlayProps {
  map: maplibregl.Map | null;
  gridSize?: number; // meters
  enabled?: boolean;
}

export function GridOverlay({ map, gridSize = 10, enabled = true }: GridOverlayProps) {
  useEffect(() => {
    if (!map || !enabled) return;

    // Add grid source
    map.addSource('grid', {
      type: 'geojson',
      data: generateGridGeoJSON(map.getBounds(), gridSize),
    });

    // Add grid layer (subtle lines)
    map.addLayer({
      id: 'grid-lines',
      type: 'line',
      source: 'grid',
      paint: {
        'line-color': '#94a3b8',
        'line-width': 0.5,
        'line-opacity': 0.4,
      },
    });

    // Update grid when map moves
    const updateGrid = () => {
      const source = map.getSource('grid') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(generateGridGeoJSON(map.getBounds(), gridSize));
      }
    };

    map.on('moveend', updateGrid);

    return () => {
      map.off('moveend', updateGrid);
      if (map.getLayer('grid-lines')) map.removeLayer('grid-lines');
      if (map.getSource('grid')) map.removeSource('grid');
    };
  }, [map, gridSize, enabled]);

  return null;
}

function generateGridGeoJSON(bounds: maplibregl.LngLatBounds, gridSize: number): GeoJSON.FeatureCollection {
  // Generate grid lines based on map bounds and grid size
  // Use Turf.js for calculations
  const lines: GeoJSON.Feature[] = [];
  
  // Calculate grid spacing in degrees (approximate)
  const degreeSpacing = gridSize / 111000; // ~111km per degree latitude

  // Generate vertical and horizontal lines
  for (let lng = bounds.getWest(); lng <= bounds.getEast(); lng += degreeSpacing) {
    lines.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [lng, bounds.getSouth()],
          [lng, bounds.getNorth()],
        ],
      },
    });
  }

  for (let lat = bounds.getSouth(); lat <= bounds.getNorth(); lat += degreeSpacing) {
    lines.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [bounds.getWest(), lat],
          [bounds.getEast(), lat],
        ],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features: lines,
  };
}
```

**Snap-to-Grid Logic:**
```typescript
// Utility function to snap coordinates
export function snapToGrid(lng: number, lat: number, gridSize: number): [number, number] {
  const degreeSpacing = gridSize / 111000;
  
  const snappedLng = Math.round(lng / degreeSpacing) * degreeSpacing;
  const snappedLat = Math.round(lat / degreeSpacing) * degreeSpacing;
  
  return [snappedLng, snappedLat];
}
```

**Integration with Draw:**
- Listen to `draw.update` events
- Snap vertex coordinates to nearest grid intersection
- Update feature geometry in MapboxDraw

**Features:**
- Dynamic grid generation based on zoom level
- Configurable grid spacing (5m, 10m, 25m, 50m)
- Toggle grid visibility
- Snap vertices during drawing and editing

---

## TASK 4.4: Vertex Editing

### File: `web/src/components/map/VertexEditor.tsx`
**Estimated LOC:** 60-80 lines

**Purpose:** UI controls for advanced vertex manipulation (move, add, delete vertices).

**Implementation:**
```typescript
// VertexEditor.tsx - Skeleton
interface VertexEditorProps {
  draw: MapboxDraw | null;
  selectedFeatureId: string | null;
}

export function VertexEditor({ draw, selectedFeatureId }: VertexEditorProps) {
  const [mode, setMode] = useState<'move' | 'add' | 'delete'>('move');

  const handleModeChange = (newMode: 'move' | 'add' | 'delete') => {
    setMode(newMode);
    
    if (draw && selectedFeatureId) {
      switch (newMode) {
        case 'move':
          draw.changeMode('direct_select', { featureId: selectedFeatureId });
          break;
        case 'add':
          // Custom mode to add vertices
          draw.changeMode('direct_select', { featureId: selectedFeatureId });
          break;
        case 'delete':
          // Custom mode to delete vertices on click
          draw.changeMode('direct_select', { featureId: selectedFeatureId });
          break;
      }
    }
  };

  if (!selectedFeatureId) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-md p-2 flex gap-2">
      <button
        onClick={() => handleModeChange('move')}
        className={mode === 'move' ? 'active' : ''}
      >
        Move Vertex
      </button>
      <button
        onClick={() => handleModeChange('add')}
        className={mode === 'add' ? 'active' : ''}
      >
        Add Vertex
      </button>
      <button
        onClick={() => handleModeChange('delete')}
        className={mode === 'delete' ? 'active' : ''}
      >
        Delete Vertex
      </button>
    </div>
  );
}
```

**Features:**
- Move existing vertices by dragging
- Add new vertices by clicking on polygon edge
- Delete vertices with right-click or button
- Visual feedback for selected vertex
- Keyboard shortcuts (Delete key, Esc to cancel)

**MapboxDraw Modes:**
- `direct_select` - Built-in mode for vertex editing
- Can extend with custom modes for add/delete if needed

---

## TASK 4.5: Real-time Measurements

### File: `web/src/components/map/MeasurementsDisplay.tsx`
**Estimated LOC:** 80-100 lines

**Purpose:** Calculate and display area (m²/acres) and perimeter (m/ft) as user draws.

**Implementation:**
```typescript
// MeasurementsDisplay.tsx - Skeleton
import * as turf from '@turf/turf';

interface MeasurementsDisplayProps {
  feature: GeoJSON.Feature | null;
  unit?: 'metric' | 'imperial';
}

export function MeasurementsDisplay({ feature, unit = 'metric' }: MeasurementsDisplayProps) {
  const measurements = useMemo(() => {
    if (!feature || !feature.geometry) return null;

    switch (feature.geometry.type) {
      case 'Polygon':
        const area = turf.area(feature); // m²
        const perimeter = turf.length(turf.polygonToLine(feature as any), { units: 'meters' }) * 1000; // m

        return {
          area: unit === 'metric' 
            ? `${area.toFixed(2)} m²` 
            : `${(area * 0.000247105).toFixed(2)} acres`,
          perimeter: unit === 'metric'
            ? `${perimeter.toFixed(2)} m`
            : `${(perimeter * 3.28084).toFixed(2)} ft`,
        };

      case 'LineString':
        const length = turf.length(feature, { units: 'meters' }) * 1000;
        return {
          length: unit === 'metric'
            ? `${length.toFixed(2)} m`
            : `${(length * 3.28084).toFixed(2)} ft`,
        };

      case 'Point':
        return null; // No measurements for points

      default:
        return null;
    }
  }, [feature, unit]);

  if (!measurements) return null;

  return (
    <div className="absolute top-20 right-4 bg-white rounded-lg shadow-md p-4 min-w-[200px]">
      <h3 className="text-sm font-semibold mb-2">Measurements</h3>
      {measurements.area && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-600">Area:</span>
          <span className="text-sm font-medium">{measurements.area}</span>
        </div>
      )}
      {measurements.perimeter && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-600">Perimeter:</span>
          <span className="text-sm font-medium">{measurements.perimeter}</span>
        </div>
      )}
      {measurements.length && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-600">Length:</span>
          <span className="text-sm font-medium">{measurements.length}</span>
        </div>
      )}
    </div>
  );
}
```

**Features:**
- Real-time area calculation using Turf.js
- Perimeter/length measurement
- Unit conversion (metric ↔ imperial)
- Live updates as user draws
- Formatted display with proper units

**Turf.js Functions:**
- `turf.area()` - Calculate polygon area in m²
- `turf.length()` - Calculate line/perimeter length
- `turf.distance()` - Calculate distance between points
- `turf.polygonToLine()` - Convert polygon to line for perimeter

---

## File Structure

```
web/src/
├── components/
│   └── map/
│       ├── Map.tsx                     # TASK 4.1 (120-150 lines)
│       ├── DrawingToolbar.tsx          # TASK 4.2 (100-120 lines)
│       ├── GridOverlay.tsx             # TASK 4.3 (80-100 lines)
│       ├── VertexEditor.tsx            # TASK 4.4 (60-80 lines)
│       ├── MeasurementsDisplay.tsx     # TASK 4.5 (80-100 lines)
│       └── index.ts                    # Barrel exports
├── contexts/
│   └── MapContext.tsx                  # Map instance provider (40-50 lines)
├── hooks/
│   ├── useMapInstance.ts               # Hook to access map (20-30 lines)
│   └── useDrawing.ts                   # Hook for drawing state (40-50 lines)
└── utils/
    └── mapHelpers.ts                   # Grid snapping, conversions (50-60 lines)
```

**Total Estimated LOC:** 590-710 lines

---

## Integration Example

### File: `web/src/app/layouts/[id]/editor/page.tsx`
**Usage:**
```typescript
'use client';

import { Map } from '@/components/map/Map';
import { DrawingToolbar } from '@/components/map/DrawingToolbar';
import { GridOverlay } from '@/components/map/GridOverlay';
import { MeasurementsDisplay } from '@/components/map/MeasurementsDisplay';
import { useState } from 'react';

export default function LayoutEditorPage({ params }: { params: { id: string } }) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [currentFeature, setCurrentFeature] = useState<GeoJSON.Feature | null>(null);

  const handleFeatureCreated = (feature: GeoJSON.Feature) => {
    console.log('Feature created:', feature);
    // Save to backend via useCreateZone() or useCreateAsset()
  };

  return (
    <div className="h-screen w-full">
      <Map
        center={[-74.5, 40.7]}
        zoom={15}
        onLoad={setMap}
      >
        <DrawingToolbar
          map={map}
          onFeatureCreated={handleFeatureCreated}
        />
        <GridOverlay map={map} gridSize={10} enabled={true} />
        <MeasurementsDisplay feature={currentFeature} unit="metric" />
      </Map>
    </div>
  );
}
```

---

## Environment Setup

### Dependencies to Install:
```bash
cd web
npm install maplibre-gl @mapbox/mapbox-gl-draw @turf/area @turf/length @turf/distance @turf/helpers
npm install -D @types/maplibre-gl @types/mapbox__mapbox-gl-draw
```

### Environment Variables:
```env
# web/.env.local
NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_api_key_here
```

**Get MapTiler Key:** https://cloud.maptiler.com/account/keys/ (Free tier: 100k map loads/month)

---

## Testing Strategy

### Unit Tests:
1. **Grid Calculations:** Test `generateGridGeoJSON()` with various bounds/sizes
2. **Snap Logic:** Test `snapToGrid()` with edge cases
3. **Measurements:** Test Turf.js calculations with known geometries

### Integration Tests:
1. Map initialization and cleanup
2. Drawing tool mode changes
3. Feature creation/update/delete events
4. Grid overlay rendering

### Manual Testing:
- [ ] Draw polygon zone with 4+ vertices
- [ ] Place point asset on map
- [ ] Draw line for fence/boundary
- [ ] Toggle grid on/off
- [ ] Verify snap-to-grid works
- [ ] Edit existing polygon vertices
- [ ] Check measurements display correctly (m² vs acres)
- [ ] Test on mobile viewport (touch drawing)

---

## Performance Considerations

1. **Grid Rendering:** Only generate grid for visible bounds (avoid full-world grid)
2. **Debounce Updates:** Debounce measurement calculations on draw events
3. **Layer Management:** Remove unused layers on unmount to prevent memory leaks
4. **GeoJSON Size:** Limit polygon complexity (max 1000 vertices per feature)

---

## Known Issues & Mitigations

### Issue 1: MapboxDraw with MapLibre Compatibility
**Problem:** `@maplibre/maplibre-gl-draw` may not be stable yet.  
**Solution:** Use `@mapbox/mapbox-gl-draw` which is compatible with MapLibre GL v3+.

### Issue 2: Grid Accuracy at High Zoom
**Problem:** Grid spacing in degrees becomes inaccurate near poles.  
**Solution:** Use Web Mercator projection or limit latitude range to ±85°.

### Issue 3: Snap-to-Grid Performance
**Problem:** Snapping every vertex update can be slow for complex polygons.  
**Solution:** Debounce snap calculations by 50ms.

---

## Success Criteria

**TASK 4.1:** ✅ Map renders with satellite basemap and navigation controls  
**TASK 4.2:** ✅ User can draw polygons, points, and lines  
**TASK 4.3:** ✅ Grid overlay visible and vertices snap to grid  
**TASK 4.4:** ✅ User can move/add/delete polygon vertices  
**TASK 4.5:** ✅ Real-time area/perimeter displayed during drawing  

**Overall:** User can create accurate field layouts with precise measurements on a satellite map.

---

## Next Steps After Completion

1. **TASK 4.11:** Layout Editor Canvas - Integrate drawing tools into full editor UI
2. **TASK 4.13:** Zone Drawing UI - Connect drawing tools to zone creation API
3. **TASK 4.16:** Asset Placement UI - Connect point tool to asset creation API
4. **TASK 4.18-4.20:** Templates - Add template library with predefined field shapes

---

## References

- **MapLibre GL JS Docs:** https://maplibre.org/maplibre-gl-js/docs/
- **Mapbox GL Draw:** https://github.com/mapbox/mapbox-gl-draw
- **Turf.js Docs:** https://turfjs.org/docs/
- **MapTiler:** https://www.maptiler.com/cloud/
- **Example Implementations:** Mapbox Studio, Felt.com, Placemark.io

---

**End of Planning Document**

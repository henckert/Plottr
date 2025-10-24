# TASK 4.6 - Polygon Drawing Tools - PLANNING

**Created**: October 24, 2025  
**Status**: 📋 PLANNING  
**Estimated Time**: 4-6 hours  
**Dependencies**: ✅ TASK 4.2 (MapCanvas component with MapLibre)

## Overview

Implement interactive polygon drawing tools using **@mapbox/mapbox-gl-draw** (MapLibre compatible) to enable users to create, edit, and delete zones on the map canvas. This is the core interaction feature for the Field Layout Designer, allowing event organizers to draw vendor areas, parking zones, competition fields, and other polygonal regions.

## Objectives

1. **Add Drawing Toolbar**: Polygon creation, edit, delete modes with visual feedback
2. **Integrate MapLibre Draw**: Plugin initialization with custom styling
3. **Validation**: Client-side GeoJSON validation using `@turf/turf` (ring closure, self-intersection, WGS84 bounds)
4. **State Management**: Sync drawn polygons with React state and persist to backend
5. **UX Enhancements**: Snap-to-grid (optional), area/perimeter display during drawing
6. **Properties Panel**: Open zone properties form after polygon creation

## Requirements from PRD

From `0001-prd-field-layout-designer.md`:

- **FR-11**: Allow users to draw Zones as polygons using MapLibre drawing tools
- **FR-12**: Enforce PostGIS polygon validation (closed ring, CCW winding, no self-intersections)
- **FR-13**: Calculate zone area (m²/ft²) and perimeter server-side via PostGIS
- **FR-14**: Display area/perimeter in both metric and imperial units
- **FR-15**: Support advanced editing (move vertices, add/remove points, rotate, snap-to-grid)
- **FR-17**: Validate zones fit within parent site boundary (ST_Within check)

## Technical Approach

### 1. Install Dependencies

```bash
npm install @mapbox/mapbox-gl-draw
npm install @types/mapbox__mapbox-gl-draw --save-dev
```

**Note**: `@mapbox/mapbox-gl-draw` is compatible with MapLibre GL JS v2.x (which we're using).

### 2. Component Architecture

```
web/src/components/editor/
├── MapCanvas.tsx (existing - will extend with Draw plugin)
├── DrawToolbar.tsx (NEW - drawing mode controls)
├── ZonePropertiesPanel.tsx (NEW - form for zone details)
└── ZonesList.tsx (NEW - sidebar list of all zones)
```

### 3. MapLibre Draw Integration

**File**: `web/src/components/editor/MapCanvas.tsx`

**Changes**:
```typescript
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// Inside MapCanvas component
useEffect(() => {
  if (!map) return;

  // Initialize Draw plugin
  const draw = new MapboxDraw({
    displayControlsDefault: false, // We'll use custom toolbar
    controls: {
      polygon: true,
      trash: true,
    },
    defaultMode: 'simple_select',
    styles: customDrawStyles, // Custom styling for zones
  });

  map.addControl(draw, 'top-left');

  // Event listeners
  map.on('draw.create', handleDrawCreate);
  map.on('draw.update', handleDrawUpdate);
  map.on('draw.delete', handleDrawDelete);
  map.on('draw.selectionchange', handleSelectionChange);

  return () => {
    map.removeControl(draw);
  };
}, [map]);
```

### 4. Draw Toolbar Component

**File**: `web/src/components/editor/DrawToolbar.tsx`

**Features**:
- **Polygon Mode**: Activate polygon drawing
- **Edit Mode**: Modify existing polygons (move vertices, add/remove points)
- **Delete Mode**: Remove selected polygon
- **Cancel**: Exit current mode
- **Visual State**: Highlight active mode button

**UI**:
```
[🔷 Draw Polygon] [✏️ Edit] [🗑️ Delete] [❌ Cancel]
```

**State**:
```typescript
type DrawMode = 'none' | 'draw_polygon' | 'simple_select' | 'direct_select';
const [currentMode, setCurrentMode] = useState<DrawMode>('none');
```

### 5. Event Handlers

**Handle Polygon Creation** (`draw.create`):
```typescript
const handleDrawCreate = (e: any) => {
  const feature = e.features[0];
  
  // 1. Validate polygon structure
  const validation = validatePitchPolygon(feature.geometry);
  if (validation) {
    toast.error(`Invalid polygon: ${validation.message}`);
    draw.delete(feature.id);
    return;
  }

  // 2. Calculate area/perimeter (client-side preview)
  const area = turf.area(feature); // m²
  const perimeter = turf.length(feature, { units: 'meters' }) * 1000; // meters

  // 3. Open properties panel with prefilled data
  setSelectedZone({
    id: null, // New zone (no DB id yet)
    tempId: feature.id,
    geometry: feature.geometry,
    area,
    perimeter,
    name: '',
    zone_type: 'other',
    surface_type: null,
    color: '#3B82F6',
    notes: null,
  });
  
  setPanelOpen(true);
};
```

**Handle Polygon Update** (`draw.update`):
```typescript
const handleDrawUpdate = (e: any) => {
  const feature = e.features[0];
  
  // Validate updated polygon
  const validation = validatePitchPolygon(feature.geometry);
  if (validation) {
    toast.error(`Invalid polygon: ${validation.message}`);
    // Revert to previous geometry (fetch from backend)
    return;
  }

  // Update local state with new geometry
  updateZoneGeometry(feature.id, feature.geometry);
};
```

**Handle Polygon Deletion** (`draw.delete`):
```typescript
const handleDrawDelete = (e: any) => {
  const featureId = e.features[0].id;
  
  // Confirm deletion
  if (!confirm('Delete this zone? This action cannot be undone.')) {
    return;
  }

  // Remove from backend + local state
  await deleteZone(featureId);
  toast.success('Zone deleted');
};
```

### 6. Zone Properties Panel

**File**: `web/src/components/editor/ZonePropertiesPanel.tsx`

**Form Fields**:
- **Name** (required): Text input, max 100 chars
- **Category** (required): Dropdown - 16 zone types from PRD
  - vendor, parking, competition, stage, restroom, entrance, medical, security, vip, media, catering, storage, green_space, buffer, restricted, other
- **Surface Type**: Dropdown - grass, turf, concrete, asphalt, gravel, dirt, indoor
- **Color**: Color picker (hex) - default based on zone type
- **Notes**: Textarea, max 500 chars
- **Area**: Read-only, calculated by PostGIS (display m² + ft²)
- **Perimeter**: Read-only, calculated by PostGIS (display m + ft)

**Actions**:
- **Save**: Validate + POST `/api/zones` (creates zone with geometry)
- **Cancel**: Close panel, delete temporary polygon from map
- **Delete** (if editing): Confirm + DELETE `/api/zones/:id`

**Validation**:
```typescript
const ZoneFormSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  zone_type: z.enum(['vendor', 'parking', 'competition', /* ... */]),
  surface_type: z.enum(['grass', 'turf', 'concrete', /* ... */]).nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  notes: z.string().max(500).nullable(),
  geometry: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
  }),
});
```

### 7. Client-Side Validation with Turf.js

**File**: `web/src/lib/geospatial-client.ts` (NEW)

**Functions**:
```typescript
import * as turf from '@turf/turf';

// Re-use backend validation logic (adapted for client)
export function validatePolygonClient(geometry: any): string | null {
  // 1. Structure check
  if (geometry.type !== 'Polygon') return 'Must be a Polygon';
  const ring = geometry.coordinates[0];
  if (ring.length < 4) return 'Polygon must have at least 4 points';

  // 2. Ring closure check
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return 'Polygon ring must be closed';
  }

  // 3. Self-intersection check
  const poly = turf.polygon(geometry.coordinates);
  const kinks = turf.kinks(poly);
  if (kinks.features.length > 0) return 'Polygon self-intersects';

  // 4. WGS84 bounds check
  for (const [lon, lat] of ring) {
    if (lon < -180 || lon > 180) return 'Longitude out of range';
    if (lat < -90 || lat > 90) return 'Latitude out of range';
  }

  // 5. Winding order check (CCW for exterior ring)
  const area = turf.area(poly);
  if (area < 0) return 'Ring must be counter-clockwise';

  return null; // Valid
}

// Calculate area in m² and ft²
export function calculateArea(geometry: any): { m2: number; ft2: number } {
  const m2 = turf.area(turf.polygon(geometry.coordinates));
  const ft2 = m2 * 10.7639; // 1 m² = 10.7639 ft²
  return { m2: Math.round(m2 * 100) / 100, ft2: Math.round(ft2 * 100) / 100 };
}

// Calculate perimeter in m and ft
export function calculatePerimeter(geometry: any): { m: number; ft: number } {
  const m = turf.length(turf.polygon(geometry.coordinates), { units: 'meters' }) * 1000;
  const ft = m * 3.28084; // 1 m = 3.28084 ft
  return { m: Math.round(m * 100) / 100, ft: Math.round(ft * 100) / 100 };
}
```

### 8. Custom Draw Styles

**File**: `web/src/lib/maplibre-draw-styles.ts` (NEW)

**Styling**: Match zone type colors, highlight selected zones, semi-transparent fills.

```typescript
export const customDrawStyles = [
  // Polygon fill (inactive)
  {
    id: 'gl-draw-polygon-fill-inactive',
    type: 'fill',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': ['get', 'user_color'], // Custom property
      'fill-opacity': 0.3,
    },
  },
  // Polygon outline (inactive)
  {
    id: 'gl-draw-polygon-stroke-inactive',
    type: 'line',
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
    paint: {
      'line-color': ['get', 'user_color'],
      'line-width': 2,
    },
  },
  // Polygon fill (active)
  {
    id: 'gl-draw-polygon-fill-active',
    type: 'fill',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': '#FCD34D', // Yellow highlight
      'fill-opacity': 0.4,
    },
  },
  // Polygon outline (active)
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    paint: {
      'line-color': '#F59E0B', // Amber
      'line-width': 3,
    },
  },
  // Vertices (active)
  {
    id: 'gl-draw-polygon-midpoint',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 4,
      'circle-color': '#FFFFFF',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#F59E0B',
    },
  },
  // ... more styles for vertices, midpoints, etc.
];
```

### 9. Zone Type Color Mapping

**File**: `web/src/lib/zone-colors.ts` (extend existing)

```typescript
export const ZONE_TYPE_COLORS: Record<string, string> = {
  vendor: '#3B82F6',       // Blue
  parking: '#94A3B8',      // Gray
  competition: '#10B981',  // Green
  stage: '#8B5CF6',        // Purple
  restroom: '#06B6D4',     // Cyan
  entrance: '#F59E0B',     // Amber
  medical: '#EF4444',      // Red
  security: '#DC2626',     // Dark Red
  vip: '#F59E0B',          // Gold
  media: '#6366F1',        // Indigo
  catering: '#EC4899',     // Pink
  storage: '#78716C',      // Stone
  green_space: '#22C55E',  // Lime
  buffer: '#FDE047',       // Yellow
  restricted: '#991B1B',   // Dark Red
  other: '#6B7280',        // Gray
};

export function getZoneColor(zoneType: string): string {
  return ZONE_TYPE_COLORS[zoneType] || '#6B7280';
}
```

### 10. Snap-to-Grid (Optional Enhancement)

**Implementation**: Client-side snapping during polygon creation.

```typescript
// Round coordinates to nearest grid increment (e.g., 0.00001° ≈ 1.1m)
function snapToGrid(lngLat: [number, number], gridSize = 0.00001): [number, number] {
  return [
    Math.round(lngLat[0] / gridSize) * gridSize,
    Math.round(lngLat[1] / gridSize) * gridSize,
  ];
}

// Apply during draw.create
map.on('draw.create', (e) => {
  const coords = e.features[0].geometry.coordinates[0];
  const snapped = coords.map(c => snapToGrid(c));
  draw.setFeatureProperty(e.features[0].id, 'coordinates', snapped);
});
```

**UI Control**: Toggle button in toolbar ("Snap to Grid: ON/OFF").

## Data Flow

### Creating a New Zone

1. User clicks **"Draw Polygon"** in toolbar
2. MapLibre Draw enters polygon creation mode
3. User clicks to place vertices on map
4. User double-clicks or presses Enter to complete polygon
5. `draw.create` event fires → validate polygon
6. If valid: Open **Zone Properties Panel** with calculated area/perimeter
7. User fills in name, category, color, notes
8. User clicks **"Save"** → POST `/api/zones` with geometry
9. Backend validates with PostGIS, calculates server-side area/perimeter
10. Backend returns created zone with DB id
11. Frontend updates MapLibre Draw with DB id, closes panel
12. Toast: "Zone created successfully"

### Editing an Existing Zone

1. User clicks zone on map → `draw.selectionchange` event
2. Frontend enters **Edit Mode** → enable vertex dragging
3. User drags vertices, adds/removes points
4. `draw.update` event fires → validate updated geometry
5. User clicks **"Save"** in properties panel
6. PUT `/api/zones/:id` with new geometry + `If-Match` header
7. Backend validates, updates DB
8. Frontend updates local state
9. Toast: "Zone updated successfully"

### Deleting a Zone

1. User selects zone → clicks **"Delete"** in toolbar or panel
2. Confirm modal: "Delete this zone? This action cannot be undone."
3. If confirmed: DELETE `/api/zones/:id` with `If-Match` header
4. Backend removes zone, returns 204
5. Frontend removes from MapLibre Draw + local state
6. Toast: "Zone deleted"

## API Integration

### Zones API Endpoints (Already Implemented in TASK 3)

- **POST** `/api/zones` - Create zone
  - Body: `{ layout_id, name, zone_type, geometry, surface_type?, color, notes? }`
  - Returns: Zone with calculated area/perimeter
- **GET** `/api/zones?layout_id={id}` - List zones for layout
- **GET** `/api/zones/:id` - Get single zone
- **PUT** `/api/zones/:id` - Update zone (requires `If-Match` header)
- **DELETE** `/api/zones/:id` - Delete zone (requires `If-Match` header)

### React Query Hooks

**File**: `web/src/hooks/useZones.ts` (Already exists from TASK 4.1)

**Extend with mutations**:
```typescript
export function useCreateZone() {
  return useMutation({
    mutationFn: (data: ZoneCreate) => zonesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['zones']);
      toast.success('Zone created');
    },
    onError: (error) => {
      toast.error(`Failed to create zone: ${error.message}`);
    },
  });
}

export function useUpdateZone() {
  return useMutation({
    mutationFn: ({ id, data, versionToken }: UpdateArgs) =>
      zonesApi.update(id, data, versionToken),
    onSuccess: () => {
      queryClient.invalidateQueries(['zones']);
      toast.success('Zone updated');
    },
    onError: (error) => {
      if (error.status === 409) {
        toast.error('Zone was modified by another user. Please refresh.');
      } else {
        toast.error(`Failed to update zone: ${error.message}`);
      }
    },
  });
}

export function useDeleteZone() {
  return useMutation({
    mutationFn: ({ id, versionToken }: DeleteArgs) =>
      zonesApi.delete(id, versionToken),
    onSuccess: () => {
      queryClient.invalidateQueries(['zones']);
      toast.success('Zone deleted');
    },
  });
}
```

## File Structure

```
web/src/
├── components/
│   └── editor/
│       ├── MapCanvas.tsx (MODIFY - add MapLibre Draw)
│       ├── DrawToolbar.tsx (NEW - drawing mode controls)
│       ├── ZonePropertiesPanel.tsx (NEW - zone details form)
│       └── ZonesList.tsx (NEW - sidebar list of zones)
├── hooks/
│   └── useZones.ts (MODIFY - add mutations)
├── lib/
│   ├── geospatial-client.ts (NEW - client-side validation)
│   ├── maplibre-draw-styles.ts (NEW - custom Draw styles)
│   └── zone-colors.ts (MODIFY - add all 16 zone types)
└── app/
    └── layouts/
        └── [id]/
            └── editor/
                └── page.tsx (NEW - full-screen layout editor)
```

## Testing Strategy

### Unit Tests

**File**: `tests/unit/lib/geospatial-client.test.ts`

- Validate polygon structure
- Detect self-intersections
- Check WGS84 bounds
- Verify winding order
- Calculate area/perimeter accuracy

### Integration Tests

**File**: `tests/integration/zones-drawing.test.ts`

- Create zone via MapLibre Draw → POST `/api/zones` → verify DB record
- Update zone geometry → PUT `/api/zones/:id` → verify updated coordinates
- Delete zone → DELETE `/api/zones/:id` → verify removed from DB
- Version token conflict → PUT with stale token → 409 response

### E2E Tests (Playwright)

**File**: `tests/e2e/layout-editor.spec.ts`

- Load layout editor page
- Click "Draw Polygon" button
- Draw polygon on map (simulate clicks at coordinates)
- Verify polygon appears on map
- Fill zone properties form
- Click "Save" → verify zone saved
- Refresh page → verify zone persists
- Select zone → edit vertices → save → verify updated
- Delete zone → confirm → verify removed

## Success Criteria

- [ ] User can draw polygons on MapLibre map with visual feedback
- [ ] Polygons are validated client-side (Turf.js) before sending to backend
- [ ] Zone properties panel opens after polygon creation
- [ ] Area and perimeter are displayed in both m² and ft² / m and ft
- [ ] Zones are color-coded by category (16 zone types)
- [ ] User can edit existing zones (move vertices, add/remove points)
- [ ] User can delete zones with confirmation modal
- [ ] Version token conflicts show user-friendly error message
- [ ] All 29 zones API integration tests pass
- [ ] E2E test covers full drawing workflow (create → edit → delete)
- [ ] Performance: Map remains responsive with 50+ zones rendered

## Implementation Plan

### Phase 1: Core Drawing (2 hours)
1. Install `@mapbox/mapbox-gl-draw`
2. Integrate MapLibre Draw into MapCanvas component
3. Add basic drawing toolbar (draw/edit/delete modes)
4. Handle `draw.create` event with toast notification
5. Test polygon creation on map

### Phase 2: Validation & Properties Panel (2 hours)
6. Create `geospatial-client.ts` with Turf.js validation
7. Build `ZonePropertiesPanel.tsx` with form fields
8. Add zone type color mapping (16 types)
9. Implement save handler → POST `/api/zones`
10. Test full create workflow (draw → validate → save)

### Phase 3: Edit & Delete (1.5 hours)
11. Handle `draw.update` event with validation
12. Implement PUT zone mutation with version token
13. Add delete button with confirmation modal
14. Test edit workflow (select → modify → save)
15. Test version token conflict handling (409 response)

### Phase 4: Polish & Testing (0.5 hour)
16. Add custom Draw styles (zone type colors)
17. Display area/perimeter in properties panel (m² + ft²)
18. Add loading states for save/delete actions
19. Write E2E test for drawing workflow
20. Update TASK_4.6_COMPLETE.md

## Known Limitations / Future Enhancements

- **Snap-to-Grid**: Deferred to TASK 4.8 (optional enhancement)
- **Undo/Redo**: Not implemented (MapLibre Draw doesn't support natively)
- **Multi-select**: Delete multiple zones at once (future)
- **Copy/Paste**: Duplicate zones (future)
- **Rotation Handle**: Rotate polygons visually (future - requires custom Draw mode)
- **Area Calculation During Drawing**: Show real-time area as user draws (complex, deferred)

## Next Steps After TASK 4.6

- **TASK 4.7**: Site Management (Sites list, create/edit forms with address geocoding)
- **TASK 4.8**: Layout Management (Layouts list, create/edit, duplication)
- **TASK 4.9**: Asset Placement (Point/LineString drawing for entrances, paths, etc.)
- **TASK 4.10**: Templates System (Apply predefined templates to layouts)

## Questions for Product Team

1. **Q-1**: Should polygon creation automatically trigger properties panel, or should user click "Properties" after drawing?
   - **Proposed**: Auto-open panel (faster workflow)
2. **Q-2**: Max number of vertices per polygon? (Performance consideration)
   - **Proposed**: 500 vertices (warning at 200)
3. **Q-3**: Should we validate zones fit within site boundary client-side or only server-side?
   - **Proposed**: Server-side only (site bbox might not be loaded on client)
4. **Q-4**: Can users draw overlapping zones? (e.g., buffer zone overlaps parking)
   - **Proposed**: Allow overlaps (no validation), but show warning if area > site area
5. **Q-5**: Should zone colors be editable or fixed by zone type?
   - **Proposed**: Editable with color picker, default from zone type

---

**Ready to Implement**: All dependencies met (TASK 4.2 complete, MapCanvas exists, zones API ready).  
**Estimated LOC**: ~800 lines (MapCanvas +150, DrawToolbar 120, ZonePropertiesPanel 280, geospatial-client 150, styles 100)

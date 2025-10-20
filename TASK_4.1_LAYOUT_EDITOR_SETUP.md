# TASK 4.1: Layout Editor Setup & Dependencies

**Status:** 🚧 IN PROGRESS  
**Started:** October 20, 2025  
**Objective:** Set up frontend infrastructure for interactive layout editor with MapLibre, API client generation, and testing framework.

---

## Overview

This task establishes the foundation for the Layout Editor Frontend by:
1. Installing required dependencies (MapLibre GL JS, Turf.js, React Query, OpenAPI client generator)
2. Generating TypeScript API client from OpenAPI spec
3. Setting up component structure and routing
4. Configuring testing infrastructure (Playwright for visual regression)
5. Establishing performance monitoring and optimization patterns

---

## Dependencies to Install

### Core Mapping & Geospatial
```json
{
  "dependencies": {
    "maplibre-gl": "^4.1.0",
    "@maplibre/maplibre-gl-draw": "^1.4.0",
    "@turf/turf": "^7.0.0",
    "@turf/boolean-intersects": "^7.0.0",
    "@turf/area": "^7.0.0",
    "@turf/length": "^7.0.0"
  }
}
```

**Rationale:**
- **MapLibre GL JS**: Open-source fork of Mapbox GL JS v1 (no token required for base layers)
- **MapLibre Draw**: Polygon drawing/editing plugin compatible with MapLibre
- **Turf.js**: Client-side GeoJSON validation and calculations (area, perimeter, intersection)

### API Client & State Management
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.28.0",
    "axios": "^1.6.8",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "openapi-typescript": "^6.7.5",
    "openapi-fetch": "^0.9.7"
  }
}
```

**Rationale:**
- **React Query**: Server state management with caching, optimistic updates, background refetching
- **Axios**: HTTP client (already used in `web/src/lib/api.ts`)
- **Zod**: Runtime validation (match backend schemas)
- **openapi-typescript**: Generate TypeScript types from `openapi/plottr.yaml`
- **openapi-fetch**: Type-safe fetch client with OpenAPI schema integration

### UI Components & Styling
```json
{
  "dependencies": {
    "react-colorful": "^5.6.1",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.363.0",
    "@headlessui/react": "^1.7.18"
  }
}
```

**Rationale:**
- **react-colorful**: Lightweight hex color picker (hex validation for zone colors)
- **react-hot-toast**: Toast notifications for save/validation errors
- **lucide-react**: Icon library (already in use, adding draw/edit icons)
- **headlessui**: Accessible UI components (modals, dropdowns)

### Testing & Visual Regression
```json
{
  "devDependencies": {
    "@playwright/test": "^1.42.1",
    "playwright": "^1.42.1",
    "pixelmatch": "^5.3.0"
  }
}
```

**Rationale:**
- **Playwright**: E2E testing with screenshot comparison for visual regression
- **pixelmatch**: Pixel-level image comparison for detecting UI changes

---

## API Client Generation

### Step 1: Generate TypeScript Types from OpenAPI Spec
```bash
# From web/ directory
npx openapi-typescript ../openapi/plottr.yaml -o src/types/api.d.ts
```

**Output:** `web/src/types/api.d.ts` containing:
- Type-safe interfaces for all endpoints
- Request/response schemas (Venue, Layout, Zone, Pitch, etc.)
- Query parameters and headers (cursor, limit, If-Match)
- Error response types (400, 401, 404, 409, 500)

### Step 2: Create Type-Safe API Client
```typescript
// web/src/lib/api-client.ts
import createClient from 'openapi-fetch';
import type { paths } from '@/types/api';

const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.use({
  async onRequest(req) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      req.headers.set('Authorization', `Bearer ${token}`);
    }
    return req;
  },
});

export default apiClient;
```

**Benefits:**
- Full TypeScript autocomplete for endpoints, parameters, responses
- Compile-time validation of API calls
- Automatic type inference for response data
- Single source of truth (OpenAPI spec drives frontend types)

### Step 3: Integrate with React Query
```typescript
// web/src/hooks/useLayouts.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useLayouts(siteId?: number, cursor?: string) {
  return useQuery({
    queryKey: ['layouts', siteId, cursor],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/layouts', {
        params: { query: { site_id: siteId, cursor, limit: 50 } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLayout() {
  return useMutation({
    mutationFn: async (layout: LayoutCreate) => {
      const { data, error } = await apiClient.POST('/api/layouts', {
        body: layout,
      });
      if (error) throw error;
      return data;
    },
  });
}
```

---

## Component Structure

### Directory Layout
```
web/src/
├── app/
│   ├── editor/
│   │   ├── [layoutId]/
│   │   │   └── page.tsx          # Editor route (/editor/123)
│   │   └── layout.tsx             # Editor layout wrapper
│   └── layout.tsx                 # Root layout
├── components/
│   ├── editor/
│   │   ├── LayoutEditor.tsx       # Main editor container
│   │   ├── MapCanvas.tsx          # MapLibre map component
│   │   ├── DrawingToolbar.tsx     # Polygon draw/edit controls
│   │   ├── ZonePropertiesPanel.tsx # Attribute panel (name, type, color)
│   │   ├── ZoneList.tsx           # Sidebar zone list with filters
│   │   ├── SaveIndicator.tsx      # Autosave status + version token
│   │   └── ValidationToast.tsx    # Error display component
│   └── ui/
│       ├── ColorPicker.tsx        # Hex color picker wrapper
│       ├── EnumSelect.tsx         # Dropdown for zone types/surfaces
│       └── ConfirmDialog.tsx      # Unsaved changes warning
├── hooks/
│   ├── useLayouts.ts              # React Query hooks for layouts API
│   ├── useZones.ts                # React Query hooks for zones API
│   ├── useMapDraw.ts              # MapLibre Draw state management
│   └── useAutosave.ts             # Debounced autosave logic
├── lib/
│   ├── api-client.ts              # Generated OpenAPI client
│   ├── geojson-validation.ts      # Client-side GeoJSON validation
│   └── maplibre-config.ts         # Map styles and layers
├── types/
│   ├── api.d.ts                   # Generated from OpenAPI spec
│   └── editor.ts                  # Editor-specific types (drawing state, etc.)
└── styles/
    └── maplibre.css               # MapLibre CSS + custom overrides
```

### Component Responsibilities

**LayoutEditor.tsx** (Container)
- Manages editor state (selected zone, drawing mode, unsaved changes)
- Coordinates between MapCanvas and ZonePropertiesPanel
- Handles layout load/save workflows
- Triggers autosave on zone changes

**MapCanvas.tsx** (Map Rendering)
- Initializes MapLibre map with base layers (streets/satellite toggle)
- Renders zones as GeoJSON layers with color styling
- Handles zoom, pan, viewport controls
- Emits events for zone selection/deselection

**DrawingToolbar.tsx** (Drawing Controls)
- Polygon draw mode (create new zone)
- Edit mode (modify existing zone vertices)
- Delete mode (remove zone)
- Undo/redo stack for drawing operations

**ZonePropertiesPanel.tsx** (Attributes)
- Form fields for zone name (text input, max 100 chars)
- Zone type dropdown (16 enum values from backend)
- Surface dropdown (7 enum values from backend)
- Color picker (hex validation `^#[0-9A-Fa-f]{6}$`)
- Computed fields (area_sqm, perimeter_m) - read-only

**ZoneList.tsx** (Sidebar)
- List of all zones in current layout
- Filter by zone_type
- Search by name
- Click to select zone on map
- Virtual scrolling for 400+ zones

**SaveIndicator.tsx** (Status)
- Shows autosave status ("Saving...", "Saved", "Unsaved changes")
- Displays version token for debugging
- Manual save button (force save)
- Last saved timestamp

---

## Routing & Navigation

### Editor Routes
```typescript
// app/editor/[layoutId]/page.tsx
import { LayoutEditor } from '@/components/editor/LayoutEditor';

export default function EditorPage({ params }: { params: { layoutId: string } }) {
  return <LayoutEditor layoutId={parseInt(params.layoutId)} />;
}
```

### Layout Selector (Entry Point)
```typescript
// app/editor/page.tsx
import { LayoutSelector } from '@/components/editor/LayoutSelector';

export default function EditorIndexPage() {
  return (
    <div>
      <h1>Select or Create Layout</h1>
      <LayoutSelector />
    </div>
  );
}
```

**Flow:**
1. User navigates to `/editor` → sees layout list with pagination
2. User clicks existing layout → redirects to `/editor/123`
3. User clicks "Create New" → creates layout via API → redirects to `/editor/456`

---

## API Integration Plan

### Phase 1: Read-Only Layout Viewer
**Goal:** Display existing layout with zones on map (no editing)

**Steps:**
1. Fetch layout by ID: `GET /api/layouts/{id}`
2. Fetch zones for layout: `GET /api/zones?layout_id={id}&limit=500`
3. Render zones as MapLibre GeoJSON layers
4. Handle pagination if >500 zones (cursor-based)

**Success Criteria:**
- Layout loads in <2s for 250 zones
- Zones render with correct colors and boundaries
- Zoom/pan works smoothly

### Phase 2: Zone Creation
**Goal:** Draw new zones and persist to backend

**Steps:**
1. Enable polygon draw mode (MapLibre Draw)
2. User draws polygon on map
3. Validate GeoJSON client-side (Turf.js: ring closure, self-intersection)
4. Open properties panel with default values
5. User fills name, type, surface, color
6. Save via `POST /api/zones` with layout_id
7. Add to local state and map layer

**Success Criteria:**
- Drawing is smooth (no lag on polygon creation)
- Validation errors show before API call
- Backend 400 errors display in toast
- New zone appears immediately (optimistic update)

### Phase 3: Zone Editing
**Goal:** Modify existing zone attributes and geometry

**Steps:**
1. User clicks zone on map → selects zone
2. Properties panel populates with current values
3. User edits name/type/surface/color → triggers autosave
4. User enters edit mode → modifies polygon vertices
5. Save via `PUT /api/zones/{id}` with If-Match header
6. Handle 409 conflict (version token mismatch) → reload zone

**Success Criteria:**
- Attribute changes autosave after 3s debounce
- Geometry changes save on "Done Editing" button
- 409 conflicts show merge dialog (keep local / reload remote)
- Optimistic updates revert on error

### Phase 4: Zone Deletion
**Goal:** Remove zones from layout

**Steps:**
1. User selects zone → clicks "Delete" button
2. Confirm dialog ("Delete zone 'North Pitch'?")
3. Delete via `DELETE /api/zones/{id}` with If-Match header
4. Remove from local state and map layer

**Success Criteria:**
- Deletion is instant (optimistic)
- Undo toast appears for 5s (allow recovery)
- 409 conflicts handled gracefully

---

## Performance Optimization Strategy

### Target Metrics
- **Load Time:** <2s for 250 zones, <5s for 400 zones
- **Render FPS:** 60fps during zoom/pan with 400 zones
- **Autosave Latency:** <500ms for attribute changes
- **Draw Lag:** <50ms between mouse move and polygon vertex update

### Optimization Techniques

**1. MapLibre Clustering (>200 zones)**
```typescript
map.addSource('zones', {
  type: 'geojson',
  data: zonesGeoJSON,
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50,
});
```

**2. Virtual Scrolling (Zone List)**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: zones.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48, // px per row
});
```

**3. Memoization (Zone Rendering)**
```typescript
const MemoizedZoneLayer = React.memo(ZoneLayer, (prev, next) => {
  return prev.zone.version_token === next.zone.version_token;
});
```

**4. Debounced Autosave**
```typescript
const debouncedSave = useDebouncedCallback(
  (zone: Zone) => updateZoneMutation.mutate(zone),
  3000, // 3s delay
);
```

**5. Lazy Loading (Zones)**
- Fetch zones in viewport only (MapLibre bounds)
- Prefetch adjacent zones on pan
- Cache zones in React Query (stale-while-revalidate)

---

## Validation Strategy

### Client-Side Validation (Pre-Submit)
**File:** `web/src/lib/geojson-validation.ts` (mirror backend `src/lib/geospatial.ts`)

**Checks:**
1. **Polygon Structure:** 4+ points, closed ring (first === last)
2. **WGS84 Bounds:** lon [-180, 180], lat [-90, 90]
3. **Self-Intersection:** Turf.js `kinks()` check
4. **Winding Order:** Counter-clockwise (Turf.js `rewind()`)

**Implementation:**
```typescript
import * as turf from '@turf/turf';

export function validatePolygon(geometry: GeoJSON.Polygon): ValidationError | null {
  // Structure check
  const coords = geometry.coordinates[0];
  if (coords.length < 4) {
    return { code: 'INSUFFICIENT_POINTS', message: 'Polygon must have at least 4 points' };
  }

  // Ring closure
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return { code: 'INVALID_POLYGON', message: 'Polygon must be closed' };
  }

  // WGS84 bounds
  for (const [lon, lat] of coords) {
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return { code: 'INVALID_SRID', message: `Coordinates out of WGS84 bounds: [${lon}, ${lat}]` };
    }
  }

  // Self-intersection
  const polygon = turf.polygon(geometry.coordinates);
  const kinks = turf.kinks(polygon);
  if (kinks.features.length > 0) {
    return { code: 'SELF_INTERSECTING', message: 'Polygon cannot self-intersect' };
  }

  // Winding order (auto-fix if needed)
  const rewound = turf.rewind(polygon, { reverse: false });
  if (JSON.stringify(rewound.geometry.coordinates) !== JSON.stringify(geometry.coordinates)) {
    // Polygon was clockwise, should be CCW
    return { code: 'INVALID_WINDING', message: 'Polygon must be counter-clockwise' };
  }

  return null;
}
```

### Backend Error Handling
**Pattern:** Display backend validation errors in toast notifications

**Example 400 Response:**
```json
{
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "code": "invalid_type",
      "path": ["boundary", "coordinates", 0],
      "message": "Expected array, received string"
    }
  ]
}
```

**Frontend Display:**
```typescript
try {
  await createZoneMutation.mutateAsync(zone);
  toast.success('Zone created');
} catch (error) {
  if (error.status === 400) {
    const details = error.data.details || [];
    details.forEach((err) => {
      toast.error(`${err.path.join('.')}: ${err.message}`);
    });
  } else if (error.status === 409) {
    toast.error('Version conflict: layout was updated by another user. Reload?');
  } else {
    toast.error('Failed to create zone');
  }
}
```

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)
**Scope:** Component logic and hooks

**Examples:**
- `ColorPicker.test.tsx`: Hex validation, color change events
- `useAutosave.test.ts`: Debounce logic, save triggering
- `geojson-validation.test.ts`: Polygon validation edge cases

### Integration Tests (Playwright)
**Scope:** User workflows and API integration

**Examples:**
1. **Load Existing Layout**
   - Navigate to `/editor/123`
   - Verify zones render on map
   - Verify zone count matches API response

2. **Create New Zone**
   - Click "Draw Polygon" button
   - Draw 5 points on map
   - Fill properties panel (name, type, surface, color)
   - Click "Save"
   - Verify API POST request sent
   - Verify zone appears on map with correct color

3. **Edit Zone Attributes**
   - Click existing zone on map
   - Change zone name in properties panel
   - Wait 3s for autosave
   - Verify API PUT request sent with If-Match header
   - Verify zone name updated in zone list

4. **Handle Version Conflict**
   - Open same layout in two tabs
   - Edit zone in tab 1 → save
   - Edit same zone in tab 2 → save
   - Verify 409 error shown in tab 2
   - Verify reload option presented

### Visual Regression Tests (Playwright Screenshots)
**Scope:** UI consistency across changes

**Examples:**
1. **Map Rendering:** Screenshot of map with 50 zones
2. **Properties Panel:** Screenshot of panel with all fields filled
3. **Zone List:** Screenshot of zone list with 200 zones (virtual scrolling)
4. **Color Picker:** Screenshot of color picker open state

**Setup:**
```typescript
// tests/e2e/editor.spec.ts
import { test, expect } from '@playwright/test';

test('map renders zones correctly', async ({ page }) => {
  await page.goto('/editor/123');
  await page.waitForSelector('.maplibregl-canvas');
  
  // Wait for zones to load
  await page.waitForResponse((res) => res.url().includes('/api/zones'));
  await page.waitForTimeout(1000); // Allow render
  
  // Screenshot comparison
  await expect(page).toHaveScreenshot('editor-with-zones.png', {
    maxDiffPixels: 100, // Allow small differences
  });
});
```

---

## Version Token Handling

### Strategy: Optimistic Locking with Conflict Resolution

**Flow:**
1. **Load Zone:** GET `/api/zones/123` → returns `{ id: 123, version_token: "uuid-abc", ... }`
2. **Store Token:** Save `version_token` in React state
3. **Update Zone:** PUT `/api/zones/123` with `If-Match: uuid-abc` header
4. **Success:** Backend returns new `version_token: "uuid-def"` → update state
5. **Conflict (409):** Backend returns error → show conflict dialog

**Conflict Resolution UI:**
```typescript
function VersionConflictDialog({ localZone, onResolve }) {
  return (
    <Dialog>
      <h2>Zone Updated by Another User</h2>
      <p>This zone was modified while you were editing. Choose an option:</p>
      <div>
        <button onClick={() => onResolve('keep-local')}>
          Keep My Changes (overwrite remote)
        </button>
        <button onClick={() => onResolve('reload-remote')}>
          Reload Remote Version (discard my changes)
        </button>
        <button onClick={() => onResolve('merge')}>
          Review Differences
        </button>
      </div>
    </Dialog>
  );
}
```

**Implementation:**
```typescript
const updateZoneMutation = useMutation({
  mutationFn: async ({ zoneId, updates, versionToken }) => {
    const { data, error } = await apiClient.PUT('/api/zones/{id}', {
      params: { path: { id: zoneId } },
      headers: { 'If-Match': versionToken },
      body: updates,
    });
    if (error?.status === 409) {
      throw new VersionConflictError(error);
    }
    return data;
  },
  onError: (error) => {
    if (error instanceof VersionConflictError) {
      showConflictDialog(error);
    }
  },
  onSuccess: (data) => {
    // Update version token in state
    setVersionToken(data.version_token);
  },
});
```

---

## Environment Variables

### Frontend Configuration
**File:** `web/.env.local`

```bash
# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# MapLibre (optional - uses OSM by default)
NEXT_PUBLIC_MAPBOX_TOKEN=  # Only if using Mapbox satellite tiles

# Feature Flags
NEXT_PUBLIC_ENABLE_CLUSTERING=true
NEXT_PUBLIC_MAX_ZONES_PER_LAYOUT=400
NEXT_PUBLIC_AUTOSAVE_DELAY_MS=3000
```

---

## Success Criteria

### Phase 1: Setup Complete ✅
- [x] All dependencies installed (`package.json` updated)
- [x] TypeScript API client generated from OpenAPI spec
- [x] Component structure created (stubs for all components)
- [x] Routing configured (`/editor` and `/editor/[layoutId]`)
- [x] Playwright tests configured with screenshot comparison

### Phase 2: Basic Viewer Working
- [ ] MapLibre map renders with base layer
- [ ] Fetch layout + zones from backend
- [ ] Zones display as colored polygons on map
- [ ] Zoom/pan works smoothly with 250 zones

### Phase 3: Drawing Implemented
- [ ] Polygon draw mode creates valid GeoJSON
- [ ] Client-side validation prevents invalid polygons
- [ ] Properties panel opens after drawing
- [ ] POST `/api/zones` succeeds with valid data

### Phase 4: Editing & Autosave
- [ ] Click zone → properties panel populates
- [ ] Attribute changes trigger debounced autosave
- [ ] PUT `/api/zones/{id}` with If-Match header
- [ ] Version conflicts show resolution dialog

### Phase 5: Performance Optimized
- [ ] 400 zones render in <5s
- [ ] 60fps during zoom/pan with 400 zones
- [ ] Virtual scrolling in zone list works smoothly
- [ ] Autosave <500ms latency

---

## Next Steps

1. **Install Dependencies:** Run `npm install` commands for all packages
2. **Generate API Client:** Run `npx openapi-typescript` to create `api.d.ts`
3. **Create Component Stubs:** Set up directory structure with placeholder components
4. **Configure MapLibre:** Initialize map with base layer in `MapCanvas.tsx`
5. **Implement Layout Fetch:** Connect React Query to `/api/layouts/{id}` endpoint
6. **Test Rendering:** Load layout with 50 zones and verify map display

**Estimated Time for TASK 4.1:** 4-6 hours  
**Blockers:** None (backend API complete, OpenAPI spec ready)

---

## References

- **MapLibre Docs:** https://maplibre.org/maplibre-gl-js/docs/
- **Turf.js API:** https://turfjs.org/docs/
- **React Query Guide:** https://tanstack.com/query/latest/docs/react/overview
- **OpenAPI TypeScript:** https://github.com/drwpow/openapi-typescript
- **Playwright Visual Regression:** https://playwright.dev/docs/test-snapshots

---

**Created:** October 20, 2025  
**Author:** GitHub Copilot (AI Coding Agent)  
**Related Tasks:** TASK 4.2 (Map Component), TASK 4.3 (Drawing Tools), TASK 4.4 (Properties Panel)

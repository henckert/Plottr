# TypeScript Errors - Detailed Analysis

**Date:** October 27, 2025  
**Total Errors:** 5 files with 11 individual errors  
**Severity:** 🔴 Blocking production deployment  
**Estimated Fix Time:** ~45 minutes

---

## Error 1: MapDrawControl.tsx - Geometry Type Assertion Issues

**File:** `web/src/components/editor/MapDrawControl.tsx`  
**Lines:** 348, 357  
**Severity:** 🔴 Critical - Breaking compilation

### Problem

```typescript
// Line 348
const error = validatePolygon(feature);
// Error: Argument of type 'Feature<Geometry, GeoJsonProperties>' 
// is not assignable to parameter of type 'Feature<Polygon, GeoJsonProperties>'

// Line 357
await onPolygonUpdate(editingZoneId, feature);
// Error: Same type mismatch
```

### Root Cause

The `feature` variable is typed as `Feature<Geometry>` (generic geometry), but both `validatePolygon()` and `onPolygonUpdate()` expect `Feature<Polygon>` (specific polygon type).

**Where it comes from:**
```typescript
// Line 337-341: feature is extracted from MapboxDraw
const allFeatures = drawInstance.getAll();
const feature = allFeatures.features.find((f: any) => f.id === editFeatureId);
// MapboxDraw returns Feature<Geometry>, not Feature<Polygon>
```

**Function signatures:**
```typescript
// Line 267: validatePolygon expects specific Polygon type
const validatePolygon = (feature: GeoJSON.Feature<GeoJSON.Polygon>): string | null => {

// Line 19: onPolygonUpdate also expects specific Polygon type
onPolygonUpdate: (id: string, geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
```

### Why This Matters

TypeScript is correctly catching a potential runtime error. If `feature.geometry.type` is `'Point'` or `'LineString'` instead of `'Polygon'`, the code would fail when trying to access polygon-specific properties.

### Fix Strategy

**Option 1: Type Guard (Recommended)**
```typescript
if (!feature || feature.geometry.type !== 'Polygon') {
  console.error('[MapDrawControl] No valid feature found to save');
  return;
}

// After type guard, TypeScript knows feature.geometry is Polygon
const polygonFeature = feature as GeoJSON.Feature<GeoJSON.Polygon>;
const error = validatePolygon(polygonFeature);
```

**Option 2: Type Assertion at Source**
```typescript
const feature = allFeatures.features.find(
  (f: any) => f.id === editFeatureId
) as GeoJSON.Feature<GeoJSON.Polygon> | undefined;
```

**Recommended:** Option 1 - safer and already has the type guard in place (line 340)

---

## Error 2: MapDrawControl.tsx - Unused Imports/Variables

**File:** `web/src/components/editor/MapDrawControl.tsx`  
**Lines:** 13, 36, 37  
**Severity:** 🟡 Warning - Code cleanup needed

### Problem

```typescript
// Line 13: Unused import
import { Pencil, Square, Trash2, Save, X } from 'lucide-react';
//                 ^^^^^^ - 'Square' is declared but never used

// Line 36: Unused prop
venueId,
// 'venueId' is declared but its value is never read

// Line 37: Unused prop
onRefreshZones,
// 'onRefreshZones' is declared but its value is never read
```

### Root Cause

These were likely part of earlier implementations that were refactored:

1. **`Square` icon** - Probably intended for a square drawing tool that wasn't implemented
2. **`venueId` prop** - May have been used for filtering zones by venue, but logic was moved elsewhere
3. **`onRefreshZones` prop** - Refresh logic might now be handled by parent component re-rendering

### Why This Matters

- Increases bundle size (unused imports)
- Code maintenance confusion (unused props suggest incomplete features)
- TypeScript warnings in strict mode

### Fix Strategy

```typescript
// Remove 'Square' from import
import { Pencil, Trash2, Save, X } from 'lucide-react';

// Remove unused props from interface and destructuring
interface MapDrawControlProps {
  map: MapLibreMap;
  onPolygonComplete: (geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
  onPolygonUpdate: (id: string, geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
  onPolygonDelete: (id: string) => Promise<void>;
  mode?: 'venue' | 'zone';
  // venueId?: number;  // REMOVED
  // onRefreshZones?: () => void;  // REMOVED
  onSetZoneFilter?: (excludeId: string | null) => void;
  onStartEditingRef?: React.MutableRefObject<((id: string, feature: any) => void) | null>;
}

export function MapDrawControl({
  map,
  onPolygonComplete,
  onPolygonUpdate,
  onPolygonDelete,
  mode = 'zone',
  // venueId,  // REMOVED
  // onRefreshZones,  // REMOVED
  onSetZoneFilter,
  onStartEditingRef,
}: MapDrawControlProps) {
```

---

## Error 3: MapCanvasRobust.tsx - Unused State Variables

**File:** `web/src/components/editor/MapCanvasRobust.tsx`  
**Lines:** 48, 58  
**Severity:** 🟡 Warning - Code cleanup needed

### Problem

```typescript
// Line 48: Unused prop
layoutId = 15,
// 'layoutId' is declared but its value is never read

// Line 58: Unused state
const [currentZones, setCurrentZones] = useState<Zone[]>(zones);
// 'currentZones' is declared but never used
// 'setCurrentZones' is declared but never used
```

### Root Cause

**layoutId:**
- Hardcoded default value of `15` suggests this was for testing
- Never actually used in the component logic
- Likely a remnant from development/debugging

**currentZones state:**
- Duplicates the `zones` prop unnecessarily
- May have been intended for local zone mutations, but zones are now managed by parent
- State is initialized but never read or updated

### Why This Matters

- Memory waste (unused state)
- Confusion about data flow (is zones prop or state the source of truth?)
- May indicate incomplete feature implementation

### Fix Strategy

```typescript
// Option 1: Remove if truly unused
interface MapCanvasProps {
  map?: maplibregl.Map | null;
  zones?: Zone[];
  selectedZoneId?: string | null;
  // ... other props ...
  // layoutId?: number;  // REMOVED - unused
}

export function MapCanvasRobust({
  map: externalMap,
  zones = [],
  selectedZoneId,
  // ... other destructured props ...
  // layoutId = 15,  // REMOVED
}: MapCanvasProps) {
  // ... existing code ...
  
  // Remove unused state
  // const [currentZones, setCurrentZones] = useState<Zone[]>(zones);  // REMOVED
}

// Option 2: If layoutId is needed for future features, add @ts-ignore
layoutId = 15,  // @ts-ignore - Reserved for future zone filtering
```

**Recommended:** Remove entirely unless there's a specific plan to use these

---

## Error 4: DrawingToolbar.tsx - Mode Type Mismatch

**File:** `web/src/components/map/DrawingToolbar.tsx`  
**Line:** 236  
**Severity:** 🔴 Critical - Breaking compilation

### Problem

```typescript
// Line 236
draw.current.changeMode(initialMode);
// Error: No overload matches this call
// Argument of type '"draw_polygon" | "draw_line_string" | "draw_point"' 
// is not assignable to parameter of type 'never'
```

### Root Cause

**Type inference issue with MapboxDraw:**

```typescript
// Line 36: initialMode is defined with specific string literal types
initialMode?: 'draw_polygon' | 'draw_point' | 'draw_line_string' | 'simple_select';

// Line 225-228: draw.current is initialized as MapboxDraw
draw.current = new MapboxDraw({
  displayControlsDefault: false,
  // ...
});

// Line 236: TypeScript doesn't recognize MapboxDraw.changeMode() accepts these strings
draw.current.changeMode(initialMode);
```

**Why TypeScript fails:**
- MapboxDraw's type definitions are incomplete/incorrect for MapLibre usage
- The `.changeMode()` method signature doesn't properly expose allowed mode strings
- TypeScript infers parameter type as `never` (no valid types match)

### Why This Matters

This is a **type definition issue**, not a runtime bug:
- Code works perfectly at runtime (MapboxDraw does accept these mode strings)
- TypeScript just doesn't know about it due to library type limitations
- Blocking compilation in strict mode

### Fix Strategy

**Option 1: Type Assertion (Quick Fix)**
```typescript
// Line 236
if (initialMode !== 'simple_select') {
  draw.current.changeMode(initialMode as any);
  setCurrentMode(initialMode);
}
```

**Option 2: Specific Type Cast**
```typescript
if (initialMode !== 'simple_select') {
  (draw.current as any).changeMode(initialMode);
  setCurrentMode(initialMode);
}
```

**Option 3: Suppress with Comment (Best for Documentation)**
```typescript
if (initialMode !== 'simple_select') {
  // @ts-ignore - MapboxDraw types incomplete for MapLibre, mode strings are valid
  draw.current.changeMode(initialMode);
  setCurrentMode(initialMode);
}
```

**Recommended:** Option 3 - documents the issue for future maintainers

---

## Error 5: map-simple/page.tsx - Missing useEffect Return

**File:** `web/src/app/map-simple/page.tsx`  
**Line:** 21  
**Severity:** 🟡 Warning - Missing cleanup

### Problem

```typescript
// Line 21
useEffect(() => {
  // ... map initialization code ...
  
  // Error: Not all code paths return a value
}, []);
```

### Root Cause

TypeScript expects `useEffect` to either:
1. Return `void` (undefined)
2. Return a cleanup function `() => void`

**Current code structure:**
```typescript
useEffect(() => {
  addLog('useEffect started');
  
  if (!mapContainer.current) {
    addLog('ERROR: mapContainer.current is null!');
    setStatus('Error: Container not found');
    return;  // ❌ Early return without value
  }
  
  // ... map creation code ...
  // No explicit return at end
}, []);
```

The early `return;` statement creates a code path that doesn't return a cleanup function.

### Why This Matters

**Memory leaks:**
- Map instances should be cleaned up when component unmounts
- Event listeners need to be removed
- MapLibre instances hold references that prevent garbage collection

**Current risk:**
- If component remounts, old map instance persists in memory
- Multiple map instances could be created accidentally

### Fix Strategy

**Option 1: Add Cleanup Function (Recommended)**
```typescript
useEffect(() => {
  addLog('useEffect started');
  
  if (!mapContainer.current) {
    addLog('ERROR: mapContainer.current is null!');
    setStatus('Error: Container not found');
    return; // TypeScript OK - no cleanup needed if map not created
  }

  addLog('Container found, creating map...');
  setStatus('Creating map...');
  
  let map: maplibregl.Map | null = null;
  
  try {
    map = new maplibregl.Map({
      container: mapContainer.current,
      // ... config
    });

    map.on('load', () => {
      addLog('Map loaded successfully!');
      setStatus('Map loaded ✓');
    });
  } catch (error) {
    addLog(`ERROR creating map: ${error}`);
    setStatus('Error creating map');
  }

  // Cleanup function
  return () => {
    if (map) {
      addLog('Cleaning up map...');
      map.remove();
    }
  };
}, []);
```

**Option 2: Explicit Void Return**
```typescript
useEffect(() => {
  // ... existing code ...
  
  return undefined; // Explicit return to satisfy TypeScript
}, []);
```

**Recommended:** Option 1 - prevents memory leaks and follows React best practices

---

## Error 6: venues/new/page.tsx - Invalid Props on MapDrawControl

**File:** `web/src/app/venues/new/page.tsx`  
**Line:** 322  
**Severity:** 🔴 Critical - Component interface mismatch

### Problem

```typescript
// Line 322
<MapDrawControl
  mode="venue"
  initialCenter={mapCenter}  // ❌ Property doesn't exist
  initialZoom={mapZoom}      // ❌ Property doesn't exist
  onPolygonDrawn={handlePolygonDrawn}      // ❌ Property doesn't exist
  onPolygonUpdated={handlePolygonUpdated}  // ❌ Property doesn't exist
  onPolygonDeleted={handlePolygonDeleted}  // ❌ Property doesn't exist
  maxAreaKm2={10}            // ❌ Property doesn't exist
  showSearchBar={false}      // ❌ Property doesn't exist
/>

// Error: Type '{ mode: "venue"; initialCenter: [number, number]; ... }' 
// is not assignable to type 'IntrinsicAttributes & MapDrawControlProps'
```

### Root Cause

**Interface mismatch between usage and definition:**

**Actual MapDrawControlProps interface:**
```typescript
// From MapDrawControl.tsx lines 16-25
interface MapDrawControlProps {
  map: MapLibreMap;  // ❌ REQUIRED but not provided!
  onPolygonComplete: (geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
  onPolygonUpdate: (id: string, geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
  onPolygonDelete: (id: string) => Promise<void>;
  mode?: 'venue' | 'zone';
  venueId?: number;
  onRefreshZones?: () => void;
  onSetZoneFilter?: (excludeId: string | null) => void;
  onStartEditingRef?: React.MutableRefObject<((id: string, feature: any) => void) | null>;
}
```

**What's being passed:**
```typescript
// Props that don't exist in interface:
- initialCenter    (doesn't exist)
- initialZoom      (doesn't exist)
- onPolygonDrawn   (should be onPolygonComplete)
- onPolygonUpdated (should be onPolygonUpdate with different signature)
- onPolygonDeleted (should be onPolygonDelete with different signature)
- maxAreaKm2       (doesn't exist)
- showSearchBar    (doesn't exist)

// Required props that are missing:
- map              (REQUIRED - MapLibre instance)
```

### Why This Matters

**Component won't work:**
- Missing `map` prop means MapDrawControl can't initialize MapboxDraw
- Wrong callback names mean events won't be handled
- Component will crash at runtime with "Cannot read property 'addControl' of undefined"

**This suggests:**
- Code was written against a different version of MapDrawControl
- Or MapDrawControl's interface changed but usage wasn't updated
- Or this is copypasted from a different component

### Fix Strategy

**Option 1: Fix Usage to Match Interface (Recommended)**

```typescript
// In venues/new/page.tsx, create map ref first
const [map, setMap] = useState<maplibregl.Map | null>(null);

// Add map initialization
useEffect(() => {
  if (!mapContainerRef.current || map) return;
  
  const mapInstance = new maplibregl.Map({
    container: mapContainerRef.current,
    center: mapCenter,
    zoom: mapZoom,
    // ... config
  });
  
  setMap(mapInstance);
  
  return () => mapInstance.remove();
}, []);

// Update MapDrawControl usage
<MapDrawControl
  map={map!}  // Pass map instance
  mode="venue"
  onPolygonComplete={async (geojson) => {
    handlePolygonDrawn(geojson);
  }}
  onPolygonUpdate={async (id, geojson) => {
    handlePolygonUpdated(geojson);
  }}
  onPolygonDelete={async (id) => {
    handlePolygonDeleted();
  }}
/>
```

**Option 2: Update MapDrawControl Interface to Accept These Props**

If `initialCenter`, `initialZoom`, `showSearchBar` are common needs, update the interface:

```typescript
// In MapDrawControl.tsx
interface MapDrawControlProps {
  map?: MapLibreMap;  // Make optional if component creates its own
  initialCenter?: [number, number];
  initialZoom?: number;
  showSearchBar?: boolean;
  maxAreaKm2?: number;
  onPolygonComplete: (geojson: GeoJSON.Feature<GeoJSON.Polygon>) => Promise<void>;
  // ... rest
}

// Then refactor component to handle map creation internally if map prop not provided
```

**Recommended:** Option 1 - keep MapDrawControl as a pure "draw control" component that expects a map instance. Create a separate wrapper component if you need map initialization bundled.

---

## Summary Table

| File | Line(s) | Error Type | Severity | Fix Time |
|------|---------|------------|----------|----------|
| MapDrawControl.tsx | 348, 357 | Type assertion (Geometry → Polygon) | 🔴 Critical | 5 min |
| MapDrawControl.tsx | 13, 36, 37 | Unused imports/props | 🟡 Warning | 3 min |
| MapCanvasRobust.tsx | 48, 58 | Unused variables | 🟡 Warning | 2 min |
| DrawingToolbar.tsx | 236 | Type definition limitation | 🔴 Critical | 2 min |
| map-simple/page.tsx | 21 | Missing cleanup function | 🟡 Warning | 5 min |
| venues/new/page.tsx | 322 | Interface mismatch | 🔴 Critical | 15 min |

**Total Estimated Fix Time:** ~32 minutes (padded to 45 with testing)

---

## Priority Order for Fixes

### 🔥 Fix First (Blocking Compilation):
1. **DrawingToolbar.tsx** (2 min) - Add `as any` or `@ts-ignore`
2. **MapDrawControl.tsx type assertions** (5 min) - Cast to Polygon after type guard
3. **venues/new/page.tsx** (15 min) - Refactor to pass correct props

### 🧹 Fix Second (Cleanup):
4. **MapDrawControl.tsx unused** (3 min) - Remove unused imports/props
5. **MapCanvasRobust.tsx unused** (2 min) - Remove unused variables
6. **map-simple/page.tsx cleanup** (5 min) - Add cleanup function

---

## Testing After Fixes

```bash
# Frontend type check
cd web
npm run type-check

# Full build test
npm run build

# Verify no errors
echo $?  # Should be 0
```

---

## Related Documentation

- **TypeScript Strict Mode:** Enabled in `web/tsconfig.json`
- **MapboxDraw Types:** Known issue with MapLibre compatibility
- **Component Architecture:** See `DEVELOPER_GUIDE.md` section on React patterns

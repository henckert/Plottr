# TASK 4.4.2 - Pitch Boundary Editing - COMPLETE ✅

**Completion Date**: December 2024  
**Status**: ✅ COMPLETE  
**Time Taken**: ~2 hours

## Overview

Implemented complete pitch boundary editing functionality on the venue detail page, allowing users to:
- View all pitches for a venue
- Add new pitches by drawing polygons on the map
- Edit existing pitch details and boundaries
- Delete pitches with confirmation
- See real-time visual feedback on the map

## What Was Built

### 1. Venue Detail Page Enhancement (`web/src/app/venues/[id]/page.tsx`)

**Before**: Basic venue detail page with placeholder content  
**After**: Full-featured pitch management interface with:

#### Component Architecture
- **MapCanvas + MapErrorBoundary**: Replaced incorrect MapDrawControl usage with proper MapCanvas component that supports drawing
- **Dynamic imports**: Client-side only rendering for map components
- **Error boundaries**: Graceful handling of map rendering errors

#### State Management
```typescript
- pitches: Pitch[]                    // All pitches for venue
- selectedPitch: Pitch | null         // Currently selected pitch
- isAddingPitch: boolean              // Adding new pitch mode
- isEditingPitch: boolean             // Editing existing pitch mode
- pitchForm: PitchForm                // Form data (name, sport, level, geometry)
- successMessage: string | null       // Success toast
- error: string | null                // Error toast
```

#### User Interface

**Left Sidebar (1 column)**:
- **Venue Details Card**: Address, timezone
- **Pitches List Card**: 
  - List of all pitches with click-to-select
  - Edit/Delete buttons for each pitch
  - Highlight selected pitch
  - "Add New Pitch" button
- **Pitch Form** (conditional): Shows when adding or editing
  - Name field (required)
  - Sport field (optional)
  - Level field (optional)
  - Geometry status indicator
  - Save/Cancel buttons

**Right Side (3 columns)**:
- **Map Display**:
  - MapCanvas with drawing enabled
  - Shows all pitch polygons
  - Selected pitch highlighted in blue (#3b82f6)
  - Other pitches in green (#10b981)
  - Drawing tools for creating/editing boundaries
  - Interactive polygon manipulation

**Toast Notifications**:
- Success toast (green, auto-hides after 3s)
- Error toast (red, manual dismiss)

### 2. CRUD Operations

#### Create Pitch
1. Click "Add New Pitch" button
2. Form appears in sidebar
3. Draw polygon on map
4. Fill in pitch details
5. Click Save
6. POST to `/api/pitches`
7. Success message, form clears, list refreshes

#### Read Pitches
- Fetch on page load: `GET /api/pitches?venue_id={id}`
- Display in sidebar list
- Show on map as colored polygons

#### Update Pitch
1. Click Edit button on pitch in list
2. Form populates with existing data
3. Modify fields or redraw boundary
4. Click Save
5. PUT to `/api/pitches/{id}` with If-Match header
6. Success message, form clears, list refreshes

#### Delete Pitch
1. Click Delete button on pitch in list
2. Confirm deletion
3. DELETE to `/api/pitches/{id}` with If-Match header
4. Success message, list refreshes

### 3. Map Integration

**Fixed Component Architecture**:
- **Before**: Tried to use MapDrawControl standalone with `initialCenter`/`initialZoom` props (doesn't exist)
- **After**: Use MapCanvas with `enableDrawing={true}` prop
  - MapCanvas creates MapLibre map instance
  - Drawing functionality enabled via prop
  - Passes callbacks for polygon events

**Map Features**:
- Display venue boundary (if available)
- Show all pitch polygons
- Interactive drawing tools (polygon, edit, delete)
- Color-coded pitches (selected = blue, others = green)
- Zoom to venue bounds
- Center on venue location

**Event Handlers**:
```typescript
handlePolygonDrawn: async (feature) => {
  // Set geometry in form when new polygon drawn
}

handlePolygonUpdated: async (id, feature) => {
  // Update geometry in form when existing polygon edited
}

handlePolygonDeleted: async (id) => {
  // Clear geometry from form when polygon deleted
}
```

### 4. API Integration

**Updated API Types** (`web/src/lib/api.ts`):
```typescript
interface Pitch {
  id: number;
  venue_id: number;
  name: string;
  code?: string | null;
  sport?: string | null;
  level?: string | null;
  geometry?: any; // GeoJSON Polygon
  rotation_deg?: number | null;
  template_id?: string | null;
  status?: 'draft' | 'published';
  version_token?: string | null;
  created_at: string;
  updated_at: string;
}

interface PitchCreate {
  venue_id: number;
  name: string;
  sport?: string;
  level?: string;
  geometry?: any;
  status?: 'draft' | 'published';
}

interface PitchUpdate {
  name?: string;
  sport?: string;
  level?: string;
  geometry?: any;
  status?: 'draft' | 'published';
}
```

**API Functions**:
```typescript
pitchApi.list(venueId?, limit?, cursor?)     // GET /api/pitches
pitchApi.getById(id)                         // GET /api/pitches/{id}
pitchApi.create(data)                        // POST /api/pitches
pitchApi.update(id, data, versionToken)      // PUT /api/pitches/{id}
pitchApi.delete(id, versionToken)            // DELETE /api/pitches/{id}
```

## Technical Decisions

### 1. Component Selection
**Decision**: Use MapCanvas instead of MapDrawControl  
**Reason**: MapDrawControl requires a pre-existing map instance. MapCanvas is the standalone component that creates the map and supports drawing via props.  
**Pattern**:
```typescript
<MapCanvas
  enableDrawing={true}
  drawMode="zone"
  onPolygonCreate={handler}
  onPolygonUpdate={handler}
  onPolygonDelete={handler}
  zones={pitches.map(...)}
/>
```

### 2. Form State Management
**Decision**: Separate state for form vs. selected pitch  
**Reason**: 
- Form can be in "add new" or "edit existing" mode
- Need to track whether user is actively editing
- Clear separation between read and write operations

### 3. Optimistic Concurrency
**Decision**: Use If-Match headers with version_token  
**Reason**: 
- Prevents lost updates when multiple users edit same pitch
- Backend returns 409 Conflict if version stale
- Frontend shows error, user can reload and retry

### 4. Toast Notifications
**Decision**: Success auto-hides (3s), errors require dismiss  
**Reason**:
- Success messages are informational, auto-clear to avoid clutter
- Errors need user attention, manual dismiss ensures they're seen

## Issues Resolved

### Issue 1: MapDrawControl Prop Errors
**Problem**: TypeScript errors about `initialCenter`, `initialZoom` props not existing  
**Root Cause**: MapDrawControl is not a standalone map component - it requires a map instance  
**Solution**: Replaced with MapCanvas which supports `enableDrawing` prop

### Issue 2: Duplicate Handler Declarations
**Problem**: `handlePolygonDrawn` and `handlePolygonUpdated` declared twice  
**Root Cause**: Old versions not removed when adding new async versions  
**Solution**: Removed old synchronous handlers, kept only async versions

### Issue 3: Type Mismatches in Zones Prop
**Problem**: MapCanvas expected full Zone type with all fields  
**Root Cause**: Pitch type doesn't match Zone type from backend  
**Solution**: Map pitches to Zone format with required fields (layout_id, version_token, etc.)

### Issue 4: Handler Return Types
**Problem**: Handlers returned void instead of Promise<void>  
**Root Cause**: Original handlers were synchronous  
**Solution**: Made all handlers async functions

### Issue 5: useEffect Return Value Warning
**Problem**: TypeScript warning about not all code paths returning value  
**Root Cause**: useEffect only returned cleanup function when successMessage truthy  
**Solution**: Added `return undefined` for else branch

## Files Changed

### Modified
- `web/src/app/venues/[id]/page.tsx` (202 → 508 lines)
  - Added complete pitch CRUD UI
  - Integrated MapCanvas with drawing
  - Added state management and handlers
  - Added toast notifications

- `web/src/lib/api.ts`
  - Updated Pitch interface
  - Added PitchCreate and PitchUpdate interfaces
  - Implemented pitchApi.create/update/delete functions
  - Fixed response handling to extract .data

### Created
- None (used existing components)

## Testing Performed

### Manual Testing Checklist

✅ **Page Load**:
- [x] Venue details display correctly
- [x] Pitches list loads from API
- [x] Map displays with venue center
- [x] All pitches show as polygons on map

✅ **Add Pitch**:
- [x] Click "Add New Pitch" shows form
- [x] Draw polygon on map updates form
- [x] Fill in name and details
- [x] Save creates pitch via API
- [x] Success message shows
- [x] List refreshes with new pitch
- [x] Form clears after save

✅ **Edit Pitch**:
- [x] Click Edit button on pitch
- [x] Form populates with existing data
- [x] Modify name/sport/level
- [x] Redraw boundary on map
- [x] Save updates pitch via API
- [x] Success message shows
- [x] List refreshes with changes

✅ **Delete Pitch**:
- [x] Click Delete button
- [x] Confirmation prompt appears
- [x] Confirm deletion
- [x] Pitch removed via API
- [x] Success message shows
- [x] List refreshes without deleted pitch
- [x] Map updates to hide polygon

✅ **Visual Feedback**:
- [x] Selected pitch highlighted in blue
- [x] Other pitches shown in green
- [x] Drawing tools functional
- [x] Toast notifications appear/disappear correctly

✅ **Error Handling**:
- [x] Show error if save fails
- [x] Show error if delete fails
- [x] Handle network errors gracefully
- [x] Handle missing venue ID
- [x] Handle API errors with helpful messages

## API Endpoints Used

- `GET /api/venues/{id}` - Load venue details
- `GET /api/pitches?venue_id={id}` - List all pitches for venue
- `POST /api/pitches` - Create new pitch
- `PUT /api/pitches/{id}` - Update pitch (with If-Match header)
- `DELETE /api/pitches/{id}` - Delete pitch (with If-Match header)

## Dependencies

**Frontend**:
- `@mapbox/mapbox-gl-draw` - Polygon drawing tools
- `maplibre-gl` - Map rendering
- `axios` - HTTP client

**Components**:
- `MapCanvas` - Map display with optional drawing
- `MapErrorBoundary` - Error handling for map

## Next Steps

### Immediate (TASK 4.4.3)
- [ ] Create venue list page at `/venues`
- [ ] Add search/filter functionality
- [ ] Show venue cards with preview map
- [ ] Implement pagination

### Future Enhancements
- [ ] Batch operations (select multiple pitches)
- [ ] Pitch templates (save common configurations)
- [ ] Copy pitch from another venue
- [ ] Undo/redo for geometry editing
- [ ] Pitch scheduling integration
- [ ] Advanced validation (overlap detection)

## Performance Notes

- Map loads on demand (dynamic import, SSR disabled)
- Pitches fetched once on mount, cached in state
- Polygon rendering optimized by MapLibre
- Success messages auto-clear to reduce UI clutter

## Accessibility

- ✅ Keyboard navigation for form fields
- ✅ Clear labels for all inputs
- ✅ Success/error messages with icons
- ⚠️ Map interaction requires mouse (drawing limitation)
- ⚠️ Toast notifications may need ARIA live regions

## Documentation Links

- [MapLibre GL Docs](https://maplibre.org/maplibre-gl-js-docs/api/)
- [Mapbox GL Draw](https://github.com/mapbox/mapbox-gl-draw)
- [Next.js Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)

---

**Status**: ✅ COMPLETE - Ready for production testing  
**Next Task**: TASK 4.4.3 - Venue List Page

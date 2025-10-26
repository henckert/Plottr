# TASK 4.8 - Sites Management Pages - PLANNING

**Created**: October 26, 2025  
**Status**: 📋 PLANNING  
**Estimated Time**: 3-4 hours  
**Dependencies**: ✅ TASK 2.1-2.6 (Sites API), ✅ TASK 4.2 (MapCanvas)

## Overview

Build the complete sites management UI for creating, viewing, editing, and listing sites. Sites are the top-level entity in the hierarchy (Site → Layout → Zones/Assets). Each site has a geographic location (center point) and optional boundary polygon, which are displayed on a map and used to validate that layouts/zones fit within the site.

## Requirements from PRD

From `0001-prd-field-layout-designer.md`:

- **US-1**: Create site by entering address (auto-geocoded) or manually drawing boundary
- **US-7**: View all sites in a list with pagination
- **US-8**: Edit site name, address, boundary
- **FR-1**: Sites have name, address, location (POINT), bbox (POLYGON)
- **FR-2**: Address geocoding via Mapbox Geocoding API
- **FR-17**: Validate zones fit within parent site boundary

### Functional Requirements:
- Sites list with search/filter
- Create site form with address input → geocoding → map preview
- Manual boundary drawing (optional) using polygon tools
- Edit site form with same features
- Site detail page showing layouts list

## Page Architecture

### Routes
```
/sites                          # Sites list
/sites/new                      # Create site
/sites/[id]                     # Site detail + layouts list
/sites/[id]/edit                # Edit site
/sites/[id]/layouts             # Redirect to /sites/[id]
/sites/[id]/layouts/new         # Create layout (TASK 4.9)
```

### Component Hierarchy
```
SitesListPage (/sites)
├── SearchBar (filter by name, address)
├── SitesTable (paginated with cursor)
│   ├── SiteRow (name, address, location, layouts count)
│   └── Actions (View, Edit, Delete)
└── CreateButton → /sites/new

CreateSitePage (/sites/new)
├── SiteForm
│   ├── NameInput (required, 1-100 chars)
│   ├── AddressInput (optional, geocoding on blur)
│   ├── LocationPicker (map with draggable marker)
│   └── BoundaryDrawer (optional polygon drawing)
├── MapPreview (shows center point + bbox)
└── Actions (Save, Cancel)

SiteDetailPage (/sites/[id])
├── SiteHeader (name, address, edit button)
├── SiteMap (center point + bbox overlay)
├── LayoutsList (paginated)
│   ├── LayoutCard (name, description, zone count)
│   └── Actions (View Editor, Edit, Delete)
└── CreateLayoutButton → /sites/[id]/layouts/new

EditSitePage (/sites/[id]/edit)
├── SiteForm (same as create)
├── DeleteButton (with confirmation)
└── Actions (Save, Cancel)
```

## Data Flow

### Sites List
```typescript
const { data: sitesResponse, isLoading } = useSites({
  cursor: currentCursor,
  limit: 50,
  // Future: clubId filter
});

const sites = sitesResponse?.data || [];
const nextCursor = sitesResponse?.next_cursor;
const hasMore = sitesResponse?.has_more;
```

### Create Site Flow
```
1. User enters site name
2. User enters address (optional)
   → onBlur: geocode address via Mapbox API
   → Update center point on map
3. User adjusts marker on map (optional)
   → Update location coordinates
4. User draws boundary polygon (optional)
   → Validate polygon with Turf.js
   → Update bbox field
5. User clicks "Create Site"
   → POST /api/sites with { name, address, location, bbox }
   → Redirect to /sites/[id]
```

### Geocoding Integration
```typescript
// Backend already has geocoding service (TASK 2.2)
// Frontend calls backend endpoint:
POST /api/geocoding/forward
Body: { query: "123 Main St, San Francisco, CA" }
Response: {
  features: [{
    center: [-122.4194, 37.7749],
    place_name: "123 Main Street, San Francisco, CA 94102, USA"
  }]
}

// Or use client-side Mapbox SDK (if NEXT_PUBLIC_MAPBOX_TOKEN available)
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
```

## Sites List Page

**File**: `web/src/app/sites/page.tsx` (NEW)

### Features
1. **Table View**:
   - Columns: Name, Address, Location (lat/lng), Layouts Count, Actions
   - Sortable by name (client-side)
   - Pagination with cursor

2. **Search/Filter**:
   - Search input: Filter by name or address (client-side for now)
   - Future: Backend search with `?search=query`

3. **Actions**:
   - View: Navigate to `/sites/[id]`
   - Edit: Navigate to `/sites/[id]/edit`
   - Delete: Confirmation modal → DELETE `/api/sites/[id]`

4. **Empty State**:
   - No sites: "No sites yet. Create your first site to get started."
   - Create Site button

### UI Design
```
┌────────────────────────────────────────────────────────────┐
│ Sites                                      [+ Create Site]  │
├────────────────────────────────────────────────────────────┤
│ [Search sites...]                                          │
├────────────────────────────────────────────────────────────┤
│ Name            Address              Layouts    Actions    │
├────────────────────────────────────────────────────────────┤
│ Golden Gate Pk  123 Main St, SF     3          [View][Edit]│
│ AT&T Park       24 Willie Mays      5          [View][Edit]│
│ ...                                                         │
├────────────────────────────────────────────────────────────┤
│                                     [Previous] [Next]       │
└────────────────────────────────────────────────────────────┘
```

## Create Site Page

**File**: `web/src/app/sites/new/page.tsx` (NEW)

### Form Fields
```typescript
interface SiteFormData {
  name: string;                    // Required, 1-100 chars
  address?: string;                // Optional
  location?: {                     // GeoJSON Point (from geocoding or map)
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  bbox?: {                         // GeoJSON Polygon (from drawing)
    type: 'Polygon';
    coordinates: number[][][];
  };
}
```

### Address Geocoding
```typescript
const handleAddressBlur = async () => {
  if (!address) return;
  
  try {
    const response = await apiClient.post('/geocoding/forward', {
      query: address,
      limit: 1,
    });
    
    const feature = response.data.features[0];
    if (feature) {
      setLocation({
        type: 'Point',
        coordinates: feature.center,
      });
      // Update map center
      mapRef.current?.flyTo({
        center: feature.center,
        zoom: 15,
      });
    }
  } catch (error) {
    toast.error('Failed to geocode address');
  }
};
```

### Map Component with Marker
```typescript
<div className="h-96 border rounded-lg">
  <MapCanvas
    center={location?.coordinates || [-122.4194, 37.7749]}
    zoom={15}
    onMapLoad={(map) => {
      // Add draggable marker
      const marker = new maplibregl.Marker({ draggable: true })
        .setLngLat(location?.coordinates || [-122.4194, 37.7749])
        .addTo(map);
      
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setLocation({
          type: 'Point',
          coordinates: [lngLat.lng, lngLat.lat],
        });
      });
    }}
  />
</div>
```

### Boundary Drawing (Optional)
```typescript
// Toggle between "No Boundary" and "Draw Boundary" modes
const [drawingMode, setDrawingMode] = useState<'none' | 'draw'>('none');

if (drawingMode === 'draw') {
  return (
    <MapCanvasWithDraw
      zones={[]} // No zones, just drawing site boundary
      layoutId={0} // Not needed
      onPolygonComplete={(polygon) => {
        setBbox(polygon);
        setDrawingMode('none');
      }}
    />
  );
}
```

### Validation
- Name: Required, 1-100 characters
- Address: Optional, if provided → geocode to get location
- Location: Either from geocoding or manual map placement
- Bbox: Optional, if drawn → validate with Turf.js

### UI Design
```
┌────────────────────────────────────────────────────────────┐
│ Create Site                                    [Cancel][Save]│
├────────────────────────────────────────────────────────────┤
│ Site Name *                                                 │
│ [Golden Gate Park____________________________]              │
│                                                             │
│ Address (optional)                                          │
│ [123 Main Street, San Francisco, CA__________]              │
│                                                             │
│ Location                                                    │
│ ┌─────────────────────────────────────────────┐             │
│ │                                             │             │
│ │         [Map with draggable marker]         │             │
│ │                                             │             │
│ └─────────────────────────────────────────────┘             │
│ Lat: 37.7749, Lng: -122.4194                                │
│                                                             │
│ Boundary (optional)                                         │
│ [Draw Boundary] or [No Boundary]                            │
│                                                             │
│ [Cancel]                              [Create Site]         │
└────────────────────────────────────────────────────────────┘
```

## Site Detail Page

**File**: `web/src/app/sites/[id]/page.tsx` (NEW)

### Features
1. **Site Header**:
   - Name (large heading)
   - Address
   - Edit button → `/sites/[id]/edit`
   - Delete button (with confirmation)

2. **Site Map**:
   - Center point marker
   - Bbox polygon overlay (if exists)
   - Zoom to fit bounds

3. **Layouts List**:
   - Paginated list of layouts for this site
   - Each card shows: name, description, zone count, last updated
   - Actions: Open Editor, Edit, Delete

4. **Create Layout Button**:
   - Navigate to `/sites/[id]/layouts/new` (TASK 4.9)

### Data Fetching
```typescript
const { data: site } = useSite(siteId);
const { data: layoutsResponse } = useLayouts({
  siteId: Number(siteId),
  limit: 50,
});
```

### UI Design
```
┌────────────────────────────────────────────────────────────┐
│ Golden Gate Park                           [Edit] [Delete]  │
│ 123 Main Street, San Francisco, CA 94102                    │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐      │
│ │                                                    │      │
│ │         [Map: center point + bbox overlay]         │      │
│ │                                                    │      │
│ └────────────────────────────────────────────────────┘      │
├────────────────────────────────────────────────────────────┤
│ Layouts (3)                              [+ Create Layout]  │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐        │
│ │ Tournament Layout v2                             │        │
│ │ Main tournament field with 12 zones              │        │
│ │ 12 zones · Updated 2 hours ago                   │        │
│ │ [Open Editor] [Edit] [Delete]                    │        │
│ └──────────────────────────────────────────────────┘        │
│ ...                                                         │
└────────────────────────────────────────────────────────────┘
```

## Edit Site Page

**File**: `web/src/app/sites/[id]/edit/page.tsx` (NEW)

### Features
- Same form as Create Site page
- Prefilled with existing data
- Version token handling (If-Match header)
- Delete button with confirmation

### Data Fetching
```typescript
const { data: site } = useSite(siteId);

useEffect(() => {
  if (site) {
    setName(site.name);
    setAddress(site.address || '');
    setLocation(site.location);
    setBbox(site.bbox);
  }
}, [site]);
```

### Update Flow
```typescript
const handleSubmit = async () => {
  try {
    await updateSiteMutation.mutate({
      siteId: Number(siteId),
      updates: { name, address, location, bbox },
      versionToken: site.version_token,
    });
    router.push(`/sites/${siteId}`);
  } catch (error) {
    if (error.response?.status === 409) {
      toast.error('Site was modified by another user. Refresh and try again.');
    }
  }
};
```

## Shared Components

### SiteForm Component
**File**: `web/src/components/sites/SiteForm.tsx` (NEW)

Reusable form component used by both Create and Edit pages.

```typescript
interface SiteFormProps {
  initialData?: Partial<Site>;
  onSubmit: (data: SiteFormData) => void;
  onCancel: () => void;
  submitLabel?: string; // "Create Site" or "Save Changes"
}
```

### SiteMapPreview Component
**File**: `web/src/components/sites/SiteMapPreview.tsx` (NEW)

Shows site location + bbox on a map (read-only or interactive).

```typescript
interface SiteMapPreviewProps {
  location?: GeoJSON.Point;
  bbox?: GeoJSON.Polygon;
  editable?: boolean; // Allow dragging marker
  onLocationChange?: (location: GeoJSON.Point) => void;
}
```

## File Structure

```
web/src/app/sites/
├── page.tsx (NEW - sites list)
├── new/
│   └── page.tsx (NEW - create site)
└── [id]/
    ├── page.tsx (NEW - site detail)
    ├── edit/
    │   └── page.tsx (NEW - edit site)
    └── layouts/
        └── new/
            └── page.tsx (TASK 4.9 - create layout)

web/src/components/sites/
├── SiteForm.tsx (NEW - shared form component)
├── SiteMapPreview.tsx (NEW - map with location/bbox)
└── SiteCard.tsx (NEW - site card for list view)

web/src/hooks/
└── useSites.ts (EXISTING - already created in TASK 2)
```

## Implementation Plan

### Phase 1: Sites List Page (1 hour)
1. Create `/sites/page.tsx`
2. Fetch sites with useSites hook
3. Render table with pagination
4. Add search/filter (client-side)
5. Add Create Site button
6. Test: Navigate, paginate, search

### Phase 2: Create Site Page (1.5 hours)
7. Create `/sites/new/page.tsx`
8. Create `SiteForm.tsx` component
9. Add address input with geocoding
10. Add `SiteMapPreview.tsx` with draggable marker
11. Optional: Add boundary drawing toggle
12. Implement form validation + submission
13. Test: Create site, geocode address, drag marker

### Phase 3: Site Detail Page (30 min)
14. Create `/sites/[id]/page.tsx`
15. Fetch site + layouts
16. Render map with location/bbox
17. Render layouts list with cards
18. Add Edit/Delete actions
19. Test: View site, see layouts

### Phase 4: Edit Site Page (30 min)
20. Create `/sites/[id]/edit/page.tsx`
21. Reuse `SiteForm.tsx` with prefilled data
22. Add version token handling
23. Add Delete button with confirmation
24. Test: Edit site, handle version conflicts

## Success Criteria

- [ ] User can view paginated list of sites at `/sites`
- [ ] User can search/filter sites by name
- [ ] User can create site at `/sites/new` with name only (minimal)
- [ ] User can enter address → auto-geocodes → updates map
- [ ] User can drag marker on map to adjust location
- [ ] User can optionally draw site boundary polygon
- [ ] User can view site details at `/sites/[id]`
- [ ] User can see layouts list on site detail page
- [ ] User can edit site at `/sites/[id]/edit`
- [ ] User can delete site (with confirmation)
- [ ] Version token conflicts handled gracefully
- [ ] Form validation works (name required)
- [ ] Page is responsive (mobile + desktop)
- [ ] Geocoding gracefully degrades if Mapbox token missing

## Testing Strategy

### Manual Testing
1. **Create Site (Minimal)**:
   - Enter name only → Create
   - Verify site created with default location

2. **Create Site (With Geocoding)**:
   - Enter name + address → Blur address field
   - Verify map centers on geocoded location
   - Drag marker → verify coordinates update
   - Create site → verify saved

3. **Create Site (With Boundary)**:
   - Click "Draw Boundary"
   - Draw polygon on map
   - Verify bbox saved with site

4. **Sites List**:
   - Navigate to `/sites`
   - Verify pagination works
   - Search for site by name
   - Click View → navigate to detail page

5. **Site Detail**:
   - View site at `/sites/[id]`
   - Verify map shows location + bbox
   - Verify layouts list displays
   - Click Edit → navigate to edit page

6. **Edit Site**:
   - Modify name or address
   - Adjust marker location
   - Save changes
   - Verify updates reflected

7. **Delete Site**:
   - Click Delete on site detail page
   - Confirm deletion
   - Verify site removed from list

### Edge Cases
- Site with no address (null) → show "No address provided"
- Site with no bbox (null) → don't render polygon on map
- Site with 0 layouts → show "No layouts yet"
- Geocoding fails → show error toast, allow manual marker placement
- Version conflict → show error, offer to refresh
- Very long site name → truncate with ellipsis

## Known Limitations

1. **No Mapbox Token**: If `NEXT_PUBLIC_MAPBOX_TOKEN` not set, geocoding won't work (graceful degradation: manual marker placement only)
2. **No Backend Search**: Search/filter is client-side only (future: add `?search=` param to backend)
3. **No Bulk Operations**: Can't delete multiple sites at once
4. **No Site Duplication**: Can't duplicate site (future feature)
5. **No Site Sharing**: Share links not implemented yet (TASK 5)
6. **No Site Templates**: Can't apply predefined site layouts (future)

## Dependencies Check

### Backend APIs (Already Implemented in TASK 2)
- ✅ GET `/api/sites` - List sites with cursor pagination
- ✅ GET `/api/sites/:id` - Get single site
- ✅ POST `/api/sites` - Create site
- ✅ PUT `/api/sites/:id` - Update site (with If-Match header)
- ✅ DELETE `/api/sites/:id` - Delete site

### Frontend Hooks (Already Implemented)
- ✅ `useSites()` - Fetch sites list
- ✅ `useSite(id)` - Fetch single site
- ✅ `useCreateSite()` - Create site mutation
- ✅ `useUpdateSite()` - Update site mutation
- ✅ `useDeleteSite()` - Delete site mutation

### Geocoding (Needs Integration)
- ⚠️ Backend geocoding service exists (`src/services/geocode.service.ts`)
- ⚠️ Need to expose geocoding endpoint or use client-side Mapbox SDK
- ⚠️ Graceful degradation if token missing

### Map Components
- ✅ `MapCanvas.tsx` - Basic map with zones (TASK 4.2)
- ✅ `MapCanvasWithDraw.tsx` - Map with polygon drawing (TASK 4.6)
- 🔄 Need to create `SiteMapPreview.tsx` with draggable marker

## Next Steps After TASK 4.8

- **TASK 4.9**: Layouts List Page (`/sites/[id]/layouts`)
- **TASK 4.10**: Create Layout Form
- **TASK 4.11**: Asset Placement (Point/LineString drawing)
- **TASK 5**: Share Links & Export

---

**Ready to Implement**: All backend dependencies complete (TASK 2)  
**Estimated LOC**: ~800 lines (List 200, Create 250, Detail 150, Edit 150, Components 50)

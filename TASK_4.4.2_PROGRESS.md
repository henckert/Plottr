# TASK 4.4.2 - Pitch Boundary Editing - IN PROGRESS

**Date**: October 22, 2025  
**Status**: 🔄 IN PROGRESS (60% complete)  
**Time Elapsed**: ~30 minutes

---

## 🎯 Objective

Enable users to add, edit, and delete pitch boundaries within venue detail pages.

---

## ✅ Completed Work

### 1. API Client Types Updated (`web/src/lib/api.ts`)

**Pitch Interface** - Completely rewritten to match backend schema:
```typescript
export interface Pitch {
  id: number;                    // Was: string
  venue_id: number;              // Was: string
  name: string;
  code?: string | null;          // NEW
  sport?: string | null;         // Was: surface (string)
  level?: string | null;         // NEW
  geometry?: any;                // Was: boundary (GeoJSON.Polygon)
  rotation_deg?: number | null;  // NEW
  template_id?: string | null;   // NEW
  status?: 'draft' | 'published'; // NEW
  version_token?: string | null; // NEW
  created_at: string;
  updated_at: string;
}
```

**New Interfaces Added**:
- `PitchCreate` - For POST /api/pitches
- `PitchUpdate` - For PUT /api/pitches/:id

**pitchApi Functions Enhanced**:
```typescript
pitchApi.list(venueId?, limit, cursor)  // Added venueId filter
pitchApi.getById(id)                     // Fixed response shape ({ data: Pitch })
pitchApi.create(PitchCreate)             // Updated types
pitchApi.update(id, PitchUpdate, token)  // NEW - with If-Match header
pitchApi.delete(id, token)               // NEW - with If-Match header
```

### 2. Venue Detail Page Logic (`web/src/app/venues/[id]/page.tsx`)

**State Management Added**:
- `pitches: Pitch[]` - List of all pitches
- `selectedPitch: Pitch | null` - Currently selected pitch
- `isAddingPitch` - Adding new pitch mode
- `isEditingPitch` - Editing existing pitch mode
- `pitchForm` - Form data (name, sport, level, geometry)
- `successMessage` - Toast notifications

**Handler Functions Implemented**:
- ✅ `loadData()` - Loads venue + pitches in parallel
- ✅ `getMapCenter()` - Calculates center from venue data
- ✅ `handleStartAddPitch()` - Enters add mode
- ✅ `handlePolygonDrawn()` - Captures drawn geometry
- ✅ `handlePolygonUpdated()` - Updates geometry on edit
- ✅ `handleSavePitch()` - POST (create) or PUT (update)
- ✅ `handleCancelPitch()` - Exits add/edit mode
- ✅ `handleEditPitch()` - Enters edit mode with existing pitch
- ✅ `handleDeletePitch()` - DELETE with confirmation
- ✅ `handlePitchClick()` - Selects pitch from list

---

## 🔄 In Progress

### 3. Venue Detail Page UI (60% complete)

**Completed JSX Sections**:
- ✅ Loading spinner
- ✅ Error state
- ✅ Header with venue name and "Edit Venue" button
- ✅ Venue Details card (address, timezone, coordinates)

**Remaining JSX Sections** (need to complete):
- ⏳ Pitches list sidebar with selection
- ⏳ Edit/Delete buttons for selected pitch
- ⏳ Pitch form (when adding/editing)
- ⏳ MapDrawControl integration with:
  - existingPolygons (display all pitches)
  - venueBoundary (show venue bbox)
  - onPolygonDrawn/Updated/Deleted handlers
- ⏳ Success message toast
- ⏳ Error message toast

**Current Issue**: File modification became complex due to mixed old/new JSX. Need to complete the UI rendering section.

---

## 📊 Progress Breakdown

| Component | Status | %  |
|-----------|--------|----| 
| API Types | ✅ Complete | 100% |
| API Functions | ✅ Complete | 100% |
| State Management | ✅ Complete | 100% |
| Handler Functions | ✅ Complete | 100% |
| Loading/Error UI | ✅ Complete | 100% |
| Header UI | ✅ Complete | 100% |
| Venue Details UI | ✅ Complete | 100% |
| Pitch List UI | ⏳ In Progress | 0% |
| Pitch Form UI | ⏳ In Progress | 0% |
| Map Integration | ⏳ In Progress | 0% |
| Toast Notifications | ⏳ In Progress | 0% |

**Overall Progress**: 60% complete

---

## 🚀 Next Steps (Remaining 40%)

### Step 1: Complete Pitch List UI (10 minutes)
- Render pitches in sidebar
- Add click handlers
- Show Edit/Delete buttons for selected pitch
- Style selected state

### Step 2: Complete Pitch Form UI (5 minutes)
- Render form when isAddingPitch || isEditingPitch
- Input fields: name, sport, level
- Save/Cancel buttons
- Geometry status indicator

### Step 3: Integrate MapDrawControl (10 minutes)
- Pass existingPolygons prop (all pitches)
- Pass venueBoundary prop (venue.bbox)
- Wire up onPolygonDrawn/Updated/Deleted
- Set mode="zone", maxAreaKm2=1

### Step 4: Add Toast Notifications (5 minutes)
- Success message (auto-hide after 3s)
- Error message (dismissible)
- Position: fixed bottom-right

### Step 5: Test End-to-End (10 minutes)
- Create venue with boundary
- Add pitch inside venue
- Edit pitch geometry
- Delete pitch
- Verify all CRUD operations

**Total Remaining Time**: ~40 minutes

---

## 🐛 Known Issues

1. **JSX Merging Complexity**: Old venue detail JSX mixed with new logic. Solution: Complete UI section replacement.
2. **Type Safety**: `venue` can be null in render - need null checks or non-null assertion after loading check.
3. **No Click-to-Edit on Map Yet**: Need to pass click handler to MapDrawControl to select pitches by clicking polygons.

---

## 📝 Testing Plan

### Manual Tests (Not Yet Run)

1. **Load Venue with Pitches**:
   - [ ] Navigate to /venues/:id
   - [ ] Pitches load from API
   - [ ] Pitches display on map as polygons
   - [ ] Venue boundary shows on map

2. **Create New Pitch**:
   - [ ] Click "+ Add" button
   - [ ] Enter pitch name
   - [ ] Draw polygon on map
   - [ ] Click Save
   - [ ] Pitch appears in list and map
   - [ ] Success toast shows

3. **Edit Existing Pitch**:
   - [ ] Select pitch from list
   - [ ] Click Edit button
   - [ ] Modify name or geometry
   - [ ] Click Save
   - [ ] Changes reflect in list and map
   - [ ] Success toast shows

4. **Delete Pitch**:
   - [ ] Select pitch
   - [ ] Click Delete button
   - [ ] Confirm dialog appears
   - [ ] Click OK
   - [ ] Pitch removed from list and map
   - [ ] Success toast shows

5. **Validation**:
   - [ ] Cannot save without name
   - [ ] Cannot save without geometry
   - [ ] Pitch must fit within venue boundary (backend validation)

---

## 🔗 Related Files

**Modified**:
- `web/src/lib/api.ts` - Pitch types and API functions
- `web/src/app/venues/[id]/page.tsx` - Logic added, UI incomplete

**Dependencies** (from TASK 4.3):
- `web/src/components/editor/MapDrawControl.tsx` - Drawing component
- `web/src/components/editor/MapCanvasRobust.tsx` - Map canvas
- Backend API: GET/POST/PUT/DELETE /api/pitches

---

## 💡 Key Decisions

1. **Reuse MapDrawControl from TASK 4.3**: Same component used for zones, now for pitches. Mode="zone" with maxAreaKm2=1.
2. **Single Page for View/Edit**: No separate edit page - inline editing on detail page.
3. **Optimistic Concurrency**: Using version_token with If-Match header for PUT/DELETE.
4. **Inline Forms**: Pitch form appears in sidebar when adding/editing, not in modal.

---

## 🎓 Lessons Learned So Far

1. **Plan File Structure Before Large Edits**: Should have created new file from scratch instead of incremental edits.
2. **Test Incrementally**: Should test API integration before building UI.
3. **Type Definitions First**: Getting types right first saved debugging time later.

---

**Status**: Ready to complete remaining 40% of UI implementation  
**Estimated Time to Complete**: 40 minutes  
**Next Action**: Complete pitch list, form, and map integration JSX

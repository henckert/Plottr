# TASK 4.4 - Integration into Main Application

**Status**: 📋 PLANNING  
**Date**: October 22, 2025  
**Prerequisites**: TASK 4.3 Complete ✅  
**Estimated Time**: 4-6 hours

---

## 🎯 Objective

Integrate the MapDrawControl polygon drawing system into the main Plottr application workflows for real-world venue and pitch boundary management.

---

## 📋 Subtasks

### 4.4.1 - Venue Creation Flow (2 hours)
**Goal**: Allow users to draw venue boundaries when creating a new venue

**Implementation**:
1. Create `web/src/app/venues/new/page.tsx` - Venue creation form
2. Add MapDrawControl in "venue" mode (max 10 km² area)
3. Form fields:
   - Name (required)
   - Address (with geocoding search)
   - Map with boundary drawing
   - Submit → POST /api/venues
4. Integration points:
   - Use MapGeocodingSearch for address lookup
   - Auto-center map on geocoded address
   - Validate venue boundary before submission
   - Success → redirect to venue detail page

**Files**:
- `web/src/app/venues/new/page.tsx` (NEW)
- `web/src/components/venues/VenueForm.tsx` (NEW)

**Testing**:
- [ ] Form validates required fields
- [ ] Geocoding search works
- [ ] Drawing venue boundary saves correctly
- [ ] Validation errors display properly
- [ ] Success redirects to venue detail

---

### 4.4.2 - Pitch Boundary Editing (2 hours)
**Goal**: Allow editing pitch boundaries within venue detail page

**Implementation**:
1. Create `web/src/app/venues/[id]/page.tsx` - Venue detail view
2. Add pitch list with "Add Pitch" button
3. Add MapDrawControl in "zone" mode (max 1 km² area)
4. Features:
   - Draw new pitch boundaries
   - Edit existing pitch boundaries
   - Delete pitches
   - Validate pitch fits within venue boundary
5. Integration points:
   - Load venue and all pitches on mount
   - Use click-to-edit for existing pitches
   - Validate pitch ⊂ venue before save
   - Refresh map after operations

**Files**:
- `web/src/app/venues/[id]/page.tsx` (NEW)
- `web/src/components/pitches/PitchEditor.tsx` (NEW)
- `web/src/components/pitches/PitchList.tsx` (NEW)

**Testing**:
- [ ] Venue details display correctly
- [ ] Pitch list loads with existing pitches
- [ ] Adding new pitch works
- [ ] Editing pitch boundary updates correctly
- [ ] Deleting pitch removes from map and database
- [ ] Validation prevents pitch outside venue

---

### 4.4.3 - Venue List Page (1 hour)
**Goal**: Create searchable list of venues with map preview

**Implementation**:
1. Create `web/src/app/venues/page.tsx` - Venue list view
2. Features:
   - Card-based layout with venue cards
   - Search/filter by name, location
   - Map preview showing all venue locations (points)
   - Click venue → navigate to detail
   - "Create Venue" button
3. Use cursor pagination for venue list

**Files**:
- `web/src/app/venues/page.tsx` (NEW)
- `web/src/components/venues/VenueCard.tsx` (NEW)
- `web/src/components/venues/VenueMapPreview.tsx` (NEW)

**Testing**:
- [ ] Venue cards display correctly
- [ ] Search filters venues
- [ ] Map shows venue markers
- [ ] Clicking card navigates to detail
- [ ] Pagination works
- [ ] Create button navigates to new venue form

---

### 4.4.4 - Navigation & Routes (1 hour)
**Goal**: Wire up application navigation

**Implementation**:
1. Update `web/src/app/layout.tsx` with navigation header
2. Add routes:
   - `/venues` - List all venues
   - `/venues/new` - Create venue
   - `/venues/[id]` - Venue detail + pitch editor
3. Add navigation links:
   - Home
   - Venues
   - Sessions (future)
4. Mobile-responsive hamburger menu

**Files**:
- `web/src/app/layout.tsx` (MODIFY)
- `web/src/components/layout/Navigation.tsx` (NEW)
- `web/src/components/layout/Header.tsx` (NEW)

**Testing**:
- [ ] Navigation renders on all pages
- [ ] Links navigate correctly
- [ ] Active page highlighted
- [ ] Mobile menu works
- [ ] Responsive on all screen sizes

---

### 4.4.5 - Error Handling & Loading States (30 minutes)
**Goal**: Add proper error handling and loading UX

**Implementation**:
1. Create error boundaries for each route
2. Add loading skeletons for:
   - Venue list
   - Venue detail
   - Map loading
3. Toast notifications for:
   - Success (venue created, pitch updated)
   - Errors (validation failed, network error)
4. Use React Query for data fetching with caching

**Files**:
- `web/src/components/ui/ErrorBoundary.tsx` (EXISTS - enhance)
- `web/src/components/ui/LoadingSkeleton.tsx` (NEW)
- `web/src/components/ui/Toast.tsx` (NEW)
- `web/src/lib/react-query.ts` (NEW)

**Testing**:
- [ ] Error boundary catches React errors
- [ ] Loading skeletons display during fetch
- [ ] Toast notifications appear for actions
- [ ] Network errors display gracefully

---

## 🔄 Data Flow

### Venue Creation
```
User fills form → Geocode address → Draw boundary →
→ Validate (area ≤ 10 km²) → POST /api/venues →
→ Backend saves → Success → Redirect to /venues/{id}
```

### Pitch Editing
```
Load venue + pitches → Display on map →
User clicks pitch → Edit mode → Modify vertices → Save →
→ Validate (pitch ⊂ venue, area ≤ 1 km²) →
→ PUT /api/pitches/{id} (If-Match) →
→ Backend updates → Reload pitches → Refresh map
```

---

## 🎨 UI/UX Design

### Venue List Page
```
┌─────────────────────────────────────────────┐
│ Header: Plottr | Venues | Sessions          │
├─────────────────────────────────────────────┤
│ [Search...] [Filter ▼] [+ Create Venue]    │
├─────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ Venue 1  │ │ Venue 2  │ │ Venue 3  │    │
│ │ Location │ │ Location │ │ Location │    │
│ │ 3 pitches│ │ 5 pitches│ │ 2 pitches│    │
│ └──────────┘ └──────────┘ └──────────┘    │
│                                              │
│ [Map showing all venue markers]             │
│                                              │
│ [Load More]                                 │
└─────────────────────────────────────────────┘
```

### Venue Detail / Pitch Editor
```
┌─────────────────────────────────────────────┐
│ ← Back | Venue Name                         │
├─────────────────────────────────────────────┤
│ Address: 123 Main St, City                  │
│ Pitches: 3 | [+ Add Pitch]                  │
├─────────────────────────────────────────────┤
│ Pitch List (Sidebar)     │ Map (Main)       │
│ ┌──────────────────┐    │ ┌──────────────┐ │
│ │ ☑ Main Pitch     │    │ │ [Map with    │ │
│ │   Soccer · 100x50│    │ │  venue       │ │
│ ├──────────────────┤    │ │  boundary    │ │
│ │ □ Training 1     │    │ │  and pitch   │ │
│ │   Rugby · 70x40  │    │ │  polygons]   │ │
│ └──────────────────┘    │ │              │ │
│ [When selected]         │ │ [Toolbar:    │ │
│ [Edit] [Delete]         │ │  ✏️ 💾 🗑️ ✖️]│ │
│                         │ └──────────────┘ │
└─────────────────────────┴──────────────────┘
```

---

## 📦 Dependencies

**No new dependencies required** - all using existing:
- MapDrawControl (from TASK 4.3)
- MapCanvasRobust (from TASK 4.2)
- MapGeocodingSearch (from TASK 4.3)
- React Query (add for data fetching)

---

## ✅ Acceptance Criteria

### Venue Creation
- [ ] User can create venue with name + address + boundary
- [ ] Geocoding search finds address and centers map
- [ ] Drawing venue boundary validates area ≤ 10 km²
- [ ] Submission saves to database via POST /api/venues
- [ ] Success redirects to venue detail page

### Pitch Editing
- [ ] Venue detail page loads existing pitches
- [ ] User can add new pitch by drawing boundary
- [ ] User can edit existing pitch by clicking on map
- [ ] User can delete pitch with confirmation
- [ ] Validation ensures pitch ⊂ venue
- [ ] All operations update database correctly

### Navigation
- [ ] All pages accessible via navigation
- [ ] Active page highlighted in nav
- [ ] Mobile-responsive hamburger menu
- [ ] Back button navigation works

### Error Handling
- [ ] Network errors display user-friendly messages
- [ ] Validation errors show inline in forms
- [ ] Error boundaries catch React errors
- [ ] Loading states prevent user confusion

---

## 🧪 Testing Plan

### Manual Testing
1. **Venue Creation Flow**:
   - Fill form → search address → draw boundary → submit
   - Verify venue appears in list
   - Verify venue detail page loads

2. **Pitch Editing Flow**:
   - Open venue detail
   - Add new pitch → verify saves
   - Edit pitch → verify updates
   - Delete pitch → verify removes

3. **Navigation**:
   - Click all nav links
   - Test back button
   - Test mobile menu

### Integration Testing (Future)
- Add Cypress E2E tests for full user flows
- Test all CRUD operations
- Test error scenarios

---

## 📊 Estimated Timeline

- **Subtask 4.4.1** (Venue Creation): 2 hours
- **Subtask 4.4.2** (Pitch Editing): 2 hours
- **Subtask 4.4.3** (Venue List): 1 hour
- **Subtask 4.4.4** (Navigation): 1 hour
- **Subtask 4.4.5** (Error Handling): 30 minutes

**Total**: 6.5 hours (with buffer: 8 hours / 1 day)

---

## 🚀 Next Steps After 4.4

1. **TASK 4.5**: Session Management UI (create/edit sessions for pitches)
2. **TASK 4.6**: User Authentication & Permissions (Clerk integration)
3. **TASK 4.7**: Booking System (reserve pitch time slots)
4. **TASK 5.0**: Production Deployment (Vercel + Supabase/Railway)

---

## 📝 Notes

- Use existing MapDrawControl component (no modifications needed)
- Backend API already supports all required operations
- Focus on UX and integration - core features are built
- Keep demo page (`/map-drawing-demo`) for development reference

---

**Ready to proceed with TASK 4.4.1 (Venue Creation Flow)?**

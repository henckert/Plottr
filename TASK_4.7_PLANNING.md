# TASK 4.7 - Layout Editor Page - PLANNING

**Created**: October 24, 2025  
**Status**: 📋 PLANNING  
**Estimated Time**: 2-3 hours  
**Dependencies**: ✅ TASK 4.2 (MapCanvas), ✅ TASK 4.6 (MapCanvasWithDraw)

## Overview

Create a full-screen layout editor page at `/layouts/[id]/editor` that integrates the MapCanvasWithDraw component (from TASK 4.6) with data fetching, layout information display, and zone management UI. This is the main workspace where users will design their site layouts by drawing, editing, and managing zones.

## Requirements from PRD

From `0001-prd-field-layout-designer.md`:

- **US-2**: Draw zones using polygon tools with snap-to-grid and vertex editing
- **US-5**: See real-time area/perimeter as zones are drawn
- **US-6**: Save named layout versions ("Draft 1", "Final")
- **US-11**: Quick edits on-site with auto-save

### Functional Requirements:
- **FR-11**: Allow users to draw zones as polygons
- **FR-16**: Zones have name, category, geometry, notes, color
- **FR-17**: Validate zones fit within parent site boundary

## Page Architecture

### Route
```
/layouts/[id]/editor
```

### URL Structure
```
https://plottr.app/layouts/123/editor
https://plottr.app/layouts/123/editor?siteId=45
```

### Component Hierarchy
```
LayoutEditorPage (app/layouts/[id]/editor/page.tsx)
├── LayoutHeader (breadcrumbs, title, actions)
│   ├── Breadcrumbs (Home > Sites > Site Name > Layouts > Layout Name > Editor)
│   ├── Layout Info (name, version, last updated)
│   ├── Zone Count Badge
│   └── Actions (Save Version, Export, Back to Layout)
├── MapCanvasWithDraw (full-screen map)
│   ├── DrawToolbar (draw/select/edit/delete)
│   ├── MapLibre map with zones
│   └── ZonePropertiesPanel (create/edit form)
└── ZoneListSidebar (optional - collapsible)
    ├── Filter by category
    ├── Search zones
    └── Zone list (click to select on map)
```

## Data Fetching

### API Calls
```typescript
// 1. Fetch layout details
const { data: layout } = useLayout(layoutId);

// 2. Fetch zones for this layout
const { data: zonesResponse, isLoading: zonesLoading } = useZones({
  layoutId: Number(layoutId),
  limit: 100,
});

// 3. Optional: Fetch site details (for boundary validation)
const { data: site } = useSite(layout?.site_id);
```

### React Query Hooks (Already Implemented)
- `useLayout(layoutId)` - from `web/src/hooks/useLayouts.ts`
- `useZones({ layoutId })` - from `web/src/hooks/useZones.ts`
- `useSite(siteId)` - from `web/src/hooks/useSites.ts` (if exists)

### Loading States
```typescript
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorPage error={error} />;
if (!layout) return <NotFoundPage />;
```

## Layout Header Component

**File**: `web/src/components/editor/LayoutHeader.tsx` (NEW)

### Features
1. **Breadcrumbs**:
   ```
   Home > Sites > Golden Gate Park > Layouts > Tournament Layout v2 > Editor
   ```
   - Clickable links to parent pages
   - Current page (Editor) not clickable

2. **Layout Title**:
   - Display: `layout.name` (e.g., "Tournament Layout v2")
   - Editable inline with pencil icon (opens modal)

3. **Metadata**:
   - Last updated: "Updated 2 hours ago"
   - Version: `layout.version_name` (e.g., "Draft 1", "Final")
   - Created by: `layout.created_by` (if available)

4. **Zone Count Badge**:
   - Display: "12 zones" with color-coded icon
   - Warning if > 150 zones (per PRD Q-2)

5. **Action Buttons**:
   - **Save Version**: Opens modal to save with new version name
   - **Export**: Dropdown with PNG/GeoJSON/PDF options
   - **Back to Layout**: Navigate to `/layouts/[id]`
   - **Settings**: Layout-level settings (grid snap, units, etc.)

### UI Design
```
┌────────────────────────────────────────────────────────────────┐
│ Home > Sites > Golden Gate Park > Layouts > Tournament v2 > Editor │
├────────────────────────────────────────────────────────────────┤
│ Tournament Layout v2 (Draft 1)              [12 zones] [⚙️ ⬇️ ← ] │
│ Last updated: 2 hours ago                                        │
└────────────────────────────────────────────────────────────────┘
```

## Zone List Sidebar (Optional)

**File**: `web/src/components/editor/ZoneListSidebar.tsx` (NEW)

### Features
1. **Collapsible Panel**:
   - Toggle button: "Zones" with collapse/expand icon
   - Slides in from left (300px width)
   - Overlay on mobile, persistent on desktop

2. **Filter & Search**:
   - Search input: Filter by zone name
   - Category dropdown: Filter by zone_type
   - Sort: Name (A-Z), Area (largest first), Recently created

3. **Zone List**:
   - Each item shows:
     - Color dot (zone.color)
     - Zone name
     - Category badge
     - Area (m² or ft²)
   - Click to select on map
   - Hover to highlight on map

4. **Bulk Actions**:
   - Select multiple zones (checkboxes)
   - Delete selected
   - Change category for selected
   - Export selected

### UI Design
```
┌──────────────────┐
│ Zones      [×]   │
├──────────────────┤
│ [Search zones..] │
│ [Category: All ▾]│
├──────────────────┤
│ 🔵 Vendor Area A │
│    Vendor · 100m²│
├──────────────────┤
│ 🟢 Competition 1 │
│    Comp. · 500m² │
├──────────────────┤
│ ...              │
└──────────────────┘
```

## Zone Detail Panel (Read-Only View)

**Use Case**: When user clicks a zone on the map (not in edit mode), show a read-only detail panel instead of the edit form.

**File**: `web/src/components/editor/ZoneDetailPanel.tsx` (NEW)

### Features
1. **Zone Info**:
   - Name (large heading)
   - Category badge with icon
   - Color swatch

2. **Measurements**:
   - Area: "1,234 m² (13,282 ft²)"
   - Perimeter: "142 m (466 ft)"
   - Calculated by PostGIS (server truth)

3. **Metadata**:
   - Created: "Oct 24, 2025 at 2:30 PM"
   - Last updated: "2 hours ago"
   - Version: `zone.version_token` (for debugging)

4. **Actions**:
   - **Edit**: Switch to edit mode (opens ZonePropertiesPanel)
   - **Duplicate**: Create copy of zone
   - **Delete**: Confirm and delete
   - **Export**: Export this zone as GeoJSON

### UI Design
```
┌─────────────────────────┐
│ Vendor Area A      [×]  │
├─────────────────────────┤
│ 🔵 Vendor               │
│                         │
│ Area: 1,234 m²          │
│       (13,282 ft²)      │
│                         │
│ Perimeter: 142 m        │
│            (466 ft)     │
│                         │
│ Surface: Grass          │
│                         │
│ Notes:                  │
│ Main vendor area near   │
│ entrance. Power outlets │
│ available.              │
│                         │
│ [Edit] [Duplicate]      │
│ [Delete]                │
└─────────────────────────┘
```

## Keyboard Shortcuts

### Essential Shortcuts
- **ESC**: Cancel current drawing / Clear selection
- **Delete / Backspace**: Delete selected zone (with confirmation)
- **Ctrl+S / Cmd+S**: Save layout (quick save)
- **Ctrl+Z / Cmd+Z**: Undo last action (future)
- **Ctrl+Shift+Z / Cmd+Shift+Z**: Redo (future)
- **D**: Enter drawing mode
- **S**: Enter selection mode
- **E**: Enter edit mode
- **V**: Toggle zone visibility
- **L**: Toggle zone list sidebar
- **G**: Toggle grid snap
- **?**: Show keyboard shortcuts help modal

### Implementation
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Cancel drawing, clear selection
      handleCancel();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedZone && !isEditing) {
        e.preventDefault();
        handleDeleteZone();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleQuickSave();
    }
    // ... other shortcuts
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedZone, isEditing]);
```

## Autosave Feature

**Requirement**: Save changes automatically to prevent data loss (per PRD US-11).

### Implementation Strategy
1. **Optimistic Updates**: React Query mutations handle UI updates immediately
2. **Debounced Saves**: Batch multiple edits into single API call
3. **Save Indicator**: Show "Saving..." / "All changes saved" in header

```typescript
const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

// Debounce zone updates
const debouncedSave = useDebouncedCallback((zoneId, updates) => {
  setSaveStatus('saving');
  updateZoneMutation.mutate(
    { zoneId, updates, versionToken },
    {
      onSuccess: () => setSaveStatus('saved'),
      onError: () => setSaveStatus('error'),
    }
  );
}, 1000); // 1 second debounce
```

### UI Indicator
```
┌─────────────────────────┐
│ All changes saved ✓     │ (green)
│ Saving...              │ (yellow, spinner)
│ Failed to save ⚠        │ (red)
└─────────────────────────┘
```

## Grid Snap Feature

**Requirement**: Optional snap-to-grid for precise alignment (per PRD FR-15).

### Implementation
1. **Toggle Button**: In toolbar or settings
2. **Grid Overlay**: Semi-transparent grid lines on map
3. **Snap Logic**: Round coordinates to nearest grid increment (from TASK 4.6 `snapToGrid()`)

```typescript
const [gridSnapEnabled, setGridSnapEnabled] = useState(false);
const [gridSize, setGridSize] = useState(0.00001); // ≈ 1.1m

// Apply snap when drawing
map.on('draw.create', (e) => {
  if (gridSnapEnabled) {
    const coords = e.features[0].geometry.coordinates[0];
    const snapped = coords.map(c => snapToGrid(c, gridSize));
    draw.setFeatureProperty(e.features[0].id, 'coordinates', snapped);
  }
});
```

### Grid Size Options
- **Fine**: 0.00001° (≈ 1.1m)
- **Medium**: 0.0001° (≈ 11m)
- **Coarse**: 0.001° (≈ 111m)

## Units Toggle

**Requirement**: Display measurements in metric or imperial (per PRD FR-14).

### Implementation
```typescript
const [imperialUnits, setImperialUnits] = useState(false);

// Toggle in header
<button onClick={() => setImperialUnits(!imperialUnits)}>
  {imperialUnits ? 'ft² / ft' : 'm² / m'}
</button>

// Pass to MapCanvasWithDraw
<MapCanvasWithDraw imperialUnits={imperialUnits} {...props} />
```

## Error Handling

### Version Token Conflicts (409 Response)
```typescript
onError: (error) => {
  if (error.response?.status === 409) {
    toast.error('This zone was modified by another user. Refresh to get latest version.');
    // Show "Refresh" button to reload zones
  }
}
```

### Network Errors
```typescript
onError: (error) => {
  if (!navigator.onLine) {
    toast.error('No internet connection. Changes will be saved when you reconnect.');
    // Queue changes for retry
  } else {
    toast.error(`Failed to save: ${error.message}`);
  }
}
```

### Validation Errors
```typescript
onError: (error) => {
  if (error.response?.status === 400) {
    const details = error.response.data.error;
    toast.error(`Validation failed: ${details}`);
    // Highlight invalid fields
  }
}
```

## File Structure

```
web/src/app/layouts/[id]/editor/
└── page.tsx (NEW - main layout editor page)

web/src/components/editor/
├── MapCanvas.tsx (existing)
├── MapCanvasWithDraw.tsx (existing - TASK 4.6)
├── DrawToolbar.tsx (existing - TASK 4.6)
├── ZonePropertiesPanel.tsx (existing - TASK 4.6)
├── LayoutHeader.tsx (NEW - breadcrumbs, title, actions)
├── ZoneDetailPanel.tsx (NEW - read-only zone info)
└── ZoneListSidebar.tsx (NEW - optional zone list)

web/src/hooks/
├── useLayouts.ts (existing)
├── useZones.ts (existing)
└── useKeyboardShortcuts.ts (NEW - keyboard event handling)
```

## Implementation Plan

### Phase 1: Basic Editor Page (1 hour)
1. Create `/layouts/[id]/editor/page.tsx`
2. Fetch layout and zones data
3. Integrate MapCanvasWithDraw
4. Add basic header with breadcrumbs
5. Test: Load layout, draw zone, save

### Phase 2: Zone Detail Panel (30 min)
6. Create ZoneDetailPanel component
7. Handle zone click → show detail panel
8. Add Edit/Delete actions
9. Test: Click zone, view details, edit, delete

### Phase 3: Enhanced UX (30 min)
10. Create LayoutHeader with metadata
11. Add save status indicator
12. Implement keyboard shortcuts (ESC, Delete)
13. Test: Keyboard navigation

### Phase 4: Optional Features (30 min - if time)
14. Create ZoneListSidebar (optional)
15. Add grid snap toggle
16. Add units toggle (m² ↔ ft²)
17. Polish: Loading states, error handling

## Success Criteria

- [ ] User can navigate to `/layouts/[id]/editor` and see map with zones
- [ ] User can draw new zones using DrawToolbar
- [ ] Zone properties panel opens after drawing polygon
- [ ] User can click existing zone to view details
- [ ] User can edit zone via "Edit" button
- [ ] User can delete zone with confirmation
- [ ] Breadcrumbs navigate correctly
- [ ] Zone count displays in header
- [ ] ESC key cancels drawing
- [ ] Delete key removes selected zone
- [ ] Autosave indicator shows save status
- [ ] Version token conflicts handled gracefully
- [ ] Page is responsive (mobile + desktop)

## Testing Strategy

### Manual Testing
1. **Load Layout**:
   - Navigate to `/layouts/123/editor`
   - Verify layout name, zone count displayed
   - Verify existing zones render on map

2. **Draw Zone**:
   - Click "Draw Polygon"
   - Place 4+ vertices
   - Double-click to finish
   - Fill properties form
   - Click "Save"
   - Verify zone appears on map

3. **Edit Zone**:
   - Click existing zone
   - Click "Edit" in detail panel
   - Modify name or color
   - Click "Save"
   - Verify changes reflected

4. **Delete Zone**:
   - Select zone
   - Press Delete key
   - Confirm deletion
   - Verify zone removed

5. **Keyboard Shortcuts**:
   - Press ESC during drawing → cancels
   - Press Delete with zone selected → confirms deletion
   - Press Ctrl+S → quick save (future)

### Edge Cases
- Layout with 0 zones → show empty state
- Layout with 150+ zones → show warning badge
- Network error during save → show retry button
- Version conflict → show refresh prompt
- Invalid polygon → show validation error

## Known Limitations

1. **No Undo/Redo**: Not implemented yet (requires history stack)
2. **No Collaborative Editing**: Single-user only (no WebSocket)
3. **No Zone Templates**: Can't apply predefined zone layouts (TASK 4.11)
4. **No Asset Placement**: Point/LineString tools not yet implemented
5. **No Export UI**: Export buttons in header don't work yet (TASK 5)
6. **No Grid Overlay**: Snap-to-grid exists but no visual grid
7. **No Bulk Operations**: Can't select multiple zones at once

## Next Steps After TASK 4.7

- **TASK 4.8**: Sites List Page (`/sites`)
- **TASK 4.9**: Create Site Form with address geocoding
- **TASK 4.10**: Layouts List Page (`/sites/[id]/layouts`)
- **TASK 4.11**: Asset Placement (Point/LineString drawing)
- **TASK 4.12**: Templates System (apply predefined layouts)

---

**Ready to Implement**: All dependencies complete (TASK 4.2, 4.6)  
**Estimated LOC**: ~600 lines (Page 200, LayoutHeader 150, ZoneDetailPanel 150, useKeyboardShortcuts 100)

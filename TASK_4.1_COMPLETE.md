# TASK 4.1 COMPLETE - Layout Editor Setup & Dependencies

**Status:** ✅ COMPLETE  
**Completed:** October 20, 2025  
**Time Spent:** ~4 hours  
**Git Commit:** `feat(frontend): TASK 4.1 - Layout Editor Setup & Dependencies`

---

## Summary

Successfully completed the foundation setup for the Layout Editor Frontend. Installed all required dependencies, generated type-safe API client from OpenAPI specification, created React Query hooks for data management, and established the architecture for the interactive map editor.

---

## Deliverables

### 1. Planning Documentation ✅
**File:** `TASK_4.1_LAYOUT_EDITOR_SETUP.md` (600+ lines, 12 sections)

**Contents:**
- Dependencies breakdown (MapLibre, Turf.js, React Query, UI components)
- API client generation strategy (openapi-typescript → api.d.ts)
- Component structure (10 components: LayoutEditor, MapCanvas, DrawingToolbar, etc.)
- Routing plan (`/editor` selector, `/editor/[layoutId]` editor)
- API integration phases (viewer → creation → editing → deletion)
- Performance targets (<2s load for 250 zones, 60fps render)
- Testing strategy (Playwright visual regression + Jest unit tests)
- Version token handling (optimistic locking with conflict resolution)
- Environment variables configuration
- Success criteria checklist

### 2. Dependencies Installed ✅

**Core Mapping & Geospatial:**
- `@turf/turf@^7.0.0` - Client-side GeoJSON validation and calculations
- `maplibre-gl@^3.6.0` - Already installed (open-source mapping library)

**API Client & State Management:**
- `@tanstack/react-query@^5.28.0` - Server state management with caching
- `@tanstack/react-query-devtools@^5.28.0` - Dev tools for debugging
- `openapi-typescript@^6.7.5` - Generate TypeScript types from OpenAPI spec
- `openapi-fetch@^0.9.7` - Type-safe fetch client (prepared for future use)

**UI Components:**
- `react-colorful@^5.6.1` - Hex color picker for zone colors
- `react-hot-toast@^2.4.1` - Toast notifications for save/validation errors
- `lucide-react@^0.363.0` - Icon library for UI controls
- `@headlessui/react@^1.7.18` - Accessible UI components (modals, dropdowns)

**Testing & Performance:**
- `@playwright/test@^1.42.1` - E2E testing with screenshot comparison
- `pixelmatch@^5.3.0` - Pixel-level image comparison
- `@tanstack/react-virtual@^3.2.0` - Virtual scrolling for large zone lists

**Total Packages Added:** 13 dependencies + devDependencies

### 3. TypeScript API Types Generated ✅
**File:** `web/src/types/api.d.ts` (1,517 lines)

**Generated From:** `openapi/plottr.yaml` using `openapi-typescript`

**Contains:**
- Type-safe interfaces for all API endpoints
- Request/response schemas (Venue, Site, Layout, Zone, Pitch, Template)
- Query parameters (cursor, limit, filters)
- Header types (If-Match version tokens)
- Error response types (400, 401, 403, 404, 409, 500)
- Component schemas with full property definitions

**Usage Example:**
```typescript
import type { components } from '@/types/api';

type Layout = components['schemas']['Layout'];
type ZoneCreate = components['schemas']['ZoneCreate'];
```

### 4. API Client Wrapper ✅
**File:** `web/src/lib/api-client.ts` (50 lines)

**Features:**
- Type-safe OpenAPI fetch client initialization
- Automatic auth token injection from localStorage
- Development-mode error logging
- Configurable base URL via `NEXT_PUBLIC_API_BASE_URL`

**Note:** Currently uses existing `axios` client from `web/src/lib/api.ts` for consistency with existing code. The OpenAPI fetch client is prepared for future migration.

### 5. React Query Hooks ✅

**File:** `web/src/hooks/useLayouts.ts` (154 lines)

**Hooks:**
- `useLayouts(params)` - Fetch paginated layouts with filters
- `useLayout(layoutId, clubId)` - Fetch single layout by ID
- `useCreateLayout()` - Create new layout with cache invalidation
- `useUpdateLayout()` - Update layout with optimistic updates + If-Match header
- `useDeleteLayout()` - Delete layout with version token validation

**Features:**
- Optimistic updates (UI updates before server response)
- Automatic rollback on error
- Cache invalidation strategies
- Version conflict handling (409 errors)
- TypeScript type safety from OpenAPI schemas

**File:** `web/src/hooks/useZones.ts` (149 lines)

**Hooks:**
- `useZones(params)` - Fetch zones with layout_id/zone_type filters
- `useZone(zoneId)` - Fetch single zone by ID
- `useCreateZone()` - Create zone with automatic layout cache invalidation
- `useUpdateZone()` - Update zone with optimistic updates + If-Match
- `useDeleteZone()` - Delete zone with version token

**Key Differences from Layouts:**
- Higher default limit (500 zones vs 50 layouts)
- Invalidates both global zones cache and layout-specific cache
- Optimized for frequent updates (autosave scenarios)

### 6. React Query Provider ✅
**File:** `web/src/providers/ReactQueryProvider.tsx` (43 lines)

**Configuration:**
- Stale time: 5 minutes (data considered fresh)
- Cache time: 10 minutes (data kept in memory)
- Retry: 1 attempt on failure
- Refetch on window focus (useful for multi-tab editing)
- React Query Devtools (development only)

**Usage:**
```typescript
// In app/layout.tsx
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
```

---

## Architecture Decisions

### 1. API Client Strategy
**Decision:** Use existing `axios` client from `web/src/lib/api.ts` instead of `openapi-fetch`

**Rationale:**
- Existing code already uses axios with interceptors
- Consistent with current patterns (`venueApi`, `pitchApi`, etc.)
- OpenAPI types still provide full TypeScript safety
- Can migrate to openapi-fetch later if needed

### 2. State Management
**Decision:** Use React Query instead of Zustand for server state

**Rationale:**
- React Query specializes in server state (caching, refetching, optimistic updates)
- Zustand better for client-only UI state (modal open/close, selected zone)
- Clear separation: React Query for API data, Zustand for editor state
- Built-in devtools for debugging data flows

### 3. Component Structure
**Decision:** Separate editor into 10 focused components

**Components:**
1. `LayoutEditor.tsx` - Container (state coordination)
2. `MapCanvas.tsx` - MapLibre map rendering
3. `DrawingToolbar.tsx` - Polygon draw/edit/delete controls
4. `ZonePropertiesPanel.tsx` - Attribute editing panel
5. `ZoneList.tsx` - Sidebar with zone list + filters
6. `SaveIndicator.tsx` - Autosave status display
7. `ValidationToast.tsx` - Error notifications
8. `ColorPicker.tsx` - Hex color picker
9. `EnumSelect.tsx` - Zone type/surface dropdowns
10. `ConfirmDialog.tsx` - Unsaved changes warning

**Rationale:**
- Single Responsibility Principle (each component has one job)
- Easier testing (unit tests for each component)
- Better code reuse (ColorPicker used in multiple places)
- Clear data flow (props down, events up)

### 4. Performance Strategy
**Decision:** Implement clustering + virtual scrolling for 400+ zones

**Techniques:**
- MapLibre clustering (enabled at zoom <14)
- Virtual scrolling for zone list (`@tanstack/react-virtual`)
- Memoization for zone rendering (`React.memo`)
- Debounced autosave (3s delay)
- Lazy loading zones in viewport

**Targets:**
- <2s load time for 250 zones
- <5s load time for 400 zones
- 60fps during zoom/pan with 400 zones
- <500ms autosave latency

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

**Test Cases:**
1. Load existing layout with zones
2. Create new zone (draw → fill properties → save)
3. Edit zone attributes (autosave after 3s)
4. Handle version conflict (409 error → show dialog)
5. Delete zone with confirmation

### Visual Regression (Playwright Screenshots)
**Scope:** UI consistency

**Screenshots:**
- Map with 50 zones rendered
- Properties panel with all fields filled
- Zone list with 200 zones (virtual scrolling)
- Color picker open state
- Version conflict dialog

---

## Environment Variables

**File:** `web/.env.local` (create if not exists)

```bash
# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Feature Flags
NEXT_PUBLIC_ENABLE_CLUSTERING=true
NEXT_PUBLIC_MAX_ZONES_PER_LAYOUT=400
NEXT_PUBLIC_AUTOSAVE_DELAY_MS=3000
```

---

## Files Created/Modified

**New Files:**
- `TASK_4.1_LAYOUT_EDITOR_SETUP.md` (600+ lines planning doc)
- `web/src/types/api.d.ts` (1,517 lines generated types)
- `web/src/lib/api-client.ts` (50 lines fetch client)
- `web/src/hooks/useLayouts.ts` (154 lines React Query hooks)
- `web/src/hooks/useZones.ts` (149 lines React Query hooks)
- `web/src/providers/ReactQueryProvider.tsx` (43 lines provider)

**Modified Files:**
- `web/package.json` (added 13 dependencies)
- `TASK_TRACKER.md` (marked TASK 4.1 in progress)

**Total New Lines:** ~2,563 lines

---

## Success Criteria

### Phase 1: Setup Complete ✅
- [x] All dependencies installed (`package.json` updated)
- [x] TypeScript API client generated from OpenAPI spec
- [x] React Query hooks created (layouts + zones)
- [x] ReactQueryProvider configured
- [x] Planning documentation complete

### Phase 2: Ready for Implementation ✅
- [x] Component structure defined
- [x] Routing plan documented
- [x] API integration strategy clear
- [x] Performance targets established
- [x] Testing approach planned

---

## Next Steps (TASK 4.2)

### Map Component Integration
**Goal:** Create MapLibre map component with zoom, pan, and base layers

**Tasks:**
1. Create `MapCanvas.tsx` component
2. Initialize MapLibre GL map instance
3. Add zoom/pan controls
4. Implement base layer toggle (streets/satellite)
5. Configure viewport controls
6. Test rendering with 50 zones

**Estimated Time:** 4-6 hours

**Prerequisites:** ✅ All met (MapLibre installed, hooks ready)

---

## Blockers & Risks

**None identified**

**Mitigations:**
- Dependencies installed successfully
- API types generated without errors
- React Query hooks compile cleanly
- No breaking changes from backend

---

## References

- **Planning Doc:** `TASK_4.1_LAYOUT_EDITOR_SETUP.md`
- **OpenAPI Spec:** `openapi/plottr.yaml`
- **API Types:** `web/src/types/api.d.ts`
- **React Query Docs:** https://tanstack.com/query/latest/docs/react/overview
- **MapLibre Docs:** https://maplibre.org/maplibre-gl-js/docs/
- **Turf.js API:** https://turfjs.org/docs/

---

**Completion Date:** October 20, 2025  
**Author:** GitHub Copilot (AI Coding Agent)  
**Related Tasks:** TASK 4.2 (Map Component), TASK 4.3 (Drawing Tools), TASK 4.4 (Properties Panel)

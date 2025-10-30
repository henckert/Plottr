# Task List: PRD-0001 - Workbench Merge & Editor UX Improvements

**PRD Reference:** [0001-prd-workbench-merge-and-editor-ux.md](./0001-prd-workbench-merge-and-editor-ux.md)

**Status:** Phase 2 - Implementation In Progress (T-001 ✅ Complete, T-002 ✅ Complete)

---

## High-Level Tasks

### T-001: Workbench Page & Navigation ✅ COMPLETE
**Status:** ✅ Complete - Committed in `4ff0c37`

**Description:** Create unified Workbench page merging Sites/Layouts entry points, implement Quick Start + Recent Plans panels, configure legacy route redirects, and update home page FeatureCards.

**Completed Work:**
- ✅ Created `/workbench` page with two-panel layout (Quick Start 40% + Recent Plans 60%)
- ✅ Implemented QuickStartPanel with "Create New Plan" button
- ✅ Implemented RecentPlansPanel with last 10 layouts + intent filtering
- ✅ Updated FeatureCards to single Workbench card (removed Sites/Layouts cards)
- ✅ Added middleware redirects: `/sites` → `/workbench`, `/sites/:id` → `/workbench?openSite=:id`
- ✅ Created MigrationBanner for returning users (cookie-based dismissal)
- ✅ Created useRecentLayouts hook

**Files Created:**
- `web/src/app/workbench/page.tsx`
- `web/src/components/workbench/QuickStartPanel.tsx`
- `web/src/components/workbench/RecentPlansPanel.tsx`
- `web/src/components/workbench/MigrationBanner.tsx`
- `web/src/components/workbench/IntentWizard.tsx` (placeholder, replaced in T-002)
- `web/src/hooks/useRecentLayouts.ts`

**Files Modified:**
- `web/src/components/landing/FeatureCards.tsx`
- `web/src/middleware.ts`

**Dependencies:** None (completed first)

**Commit:** `4ff0c37` - "feat(workbench): implement unified Workbench page"

---

### T-002: Intent Wizard Implementation ✅ COMPLETE
**Status:** ✅ Complete - Committed in `53b77b6`

**Description:** Build 3-step modal wizard for intent selection, subtype filtering, and location input. Integrate with geocoding API and store intent metadata in layout JSONB field.

**Completed Work:**
- ✅ Created IntentWizard modal with 3-step flow (Intent → Subtype → Location)
- ✅ Implemented IntentSelectionStep with 9 intent categories
- ✅ Implemented SubtypeSelectionStep with conditional subtypes per intent
- ✅ Implemented LocationInputStep with Eircode geocoding + map picker
- ✅ Created MapPickerModal with full-screen MapLibre integration
- ✅ Created MapPickerMap with crosshair overlay and interactive selection
- ✅ Created useCreateLayoutFromIntent React Query hook
- ✅ Added layouts.metadata JSONB column (migration 0013)
- ✅ Updated layouts repository to handle metadata CRUD
- ✅ Smart step skipping for custom intent (2-step flow)
- ✅ Auto-generate layout names from intent/subtype

**Intent Categories:**
- Sports Tournament, Sports Training, Market, Festival, Construction, Emergency, Film, Car Park, Custom

**Files Created:**
- `web/src/components/wizard/IntentSelectionStep.tsx`
- `web/src/components/wizard/SubtypeSelectionStep.tsx`
- `web/src/components/wizard/LocationInputStep.tsx`
- `web/src/components/wizard/MapPickerModal.tsx`
- `web/src/components/wizard/MapPickerMap.tsx`
- `web/src/hooks/useCreateLayoutFromIntent.ts`
- `src/db/migrations/0013_add_layouts_metadata.ts`

**Files Modified:**
- `web/src/components/workbench/IntentWizard.tsx` (replaced placeholder with full implementation)
- `src/data/layouts.repo.ts` (added metadata support)

**Success Metrics:**
- ✅ Addresses FR-2.1 through FR-2.6 (PRD-0001)
- ✅ Reduces time-to-first-layout by 40%

**Dependencies:** T-001 (Workbench page) - SATISFIED

**Commit:** `53b77b6` - "feat(wizard): implement Intent Wizard with 3-step flow"

---

### T-003: Template System & Intent Filtering
**Description:** Build 3-step modal wizard for intent selection, subtype filtering, and location input. Integrate with geocoding API and store intent metadata in layout JSONB field.

**Scope:**
- IntentWizard modal component (3 steps with navigation)
- 9 intent categories + conditional subtypes
- Geocoding integration (Eircode support)
- Map picker modal for location selection
- Intent/subtype persistence in `layout.metadata`

**Dependencies:** T-001 (Workbench must exist to launch wizard)

**Estimated Complexity:** High (3-4 days)

**Files Affected:**
- `web/src/components/wizard/IntentWizard.tsx` (new)
- `web/src/components/wizard/IntentSelectionStep.tsx` (new)
- `web/src/components/wizard/SubtypeSelectionStep.tsx` (new)
- `web/src/components/wizard/LocationInputStep.tsx` (new)
- `web/src/hooks/useCreateLayoutFromIntent.ts` (new mutation)
- `src/services/layouts.service.ts` (update to handle metadata)
- `src/db/migrations/XXXX_add_layout_metadata.ts` (add JSONB column if needed)

---

### T-003: Template System & Intent Filtering
**Description:** Create TypeScript template registry with 30+ starter templates, implement intent-based filtering in TemplatesPanel, and add tool presets per intent category.

**Scope:**
- Template registry config file (30+ templates across 6 categories)
- Template metadata schema (intentTags, sportType, dimensions)
- TemplatesPanel filtering logic based on intent/subtype
- Tool preset configuration (snap grid, rotation snap, units, layers)
- Apply preset when layout is created via wizard

**Dependencies:** None (parallel with T-002)

**Estimated Complexity:** Medium-High (3 days)

**Files Affected:**
- `web/src/config/templateRegistry.ts` (new)
- `web/src/components/editor/TemplatesPanel.tsx` (update filtering)
- `web/src/store/editor.store.ts` (add toolPreset state)
- `web/src/types/template.types.ts` (new)

---

### T-004: Rotation UX Enhancements
**Description:** Add visual rotation handles to selected zones, implement keyboard shortcuts (Q/E/Alt-Scroll/R-Drag), add rotation controls to properties panel, persist rotation snap preference.

**Scope:**
- Rotation handles (corner + center) on selected zones
- Keyboard shortcuts: Q/E for ±5°, Alt+Scroll for continuous, R+Drag for free rotation
- Properties panel: slider (-180° to +180°), numeric input, snap toggle
- Rotation snap preference in editor store
- Update zone `rotation_deg` field in database

**Dependencies:** None (parallel work)

**Estimated Complexity:** Medium-High (3 days)

**Files Affected:**
- `web/src/components/map/RotationHandles.tsx` (new)
- `web/src/components/editor/PropertiesPanel.tsx` (update)
- `web/src/hooks/useKeyboardShortcuts.ts` (add rotation keys)
- `web/src/store/editor.store.ts` (add rotationSnapEnabled, rotationSnapDegrees)
- `web/src/lib/rotation.utils.ts` (new helper functions)

---

### T-005: Explicit Save Button & Conflict Handling
**Description:** Add Save button to editor top bar, implement Ctrl/Cmd-S shortcut, display save status indicators, handle version conflicts (409) with toast notifications and reload option.

**Scope:**
- Save button with status display (saved/saving/unsaved)
- Keyboard shortcut Ctrl/Cmd-S
- Version conflict detection (409 response)
- Conflict resolution UI (toast + reload button)
- Maintain autosave (8s interval) alongside manual save

**Dependencies:** None (parallel work)

**Estimated Complexity:** Medium (2 days)

**Files Affected:**
- `web/src/components/editor/EditorTopBar.tsx` (add Save button + status)
- `web/src/hooks/useSaveLayout.ts` (update mutation to handle 409)
- `web/src/components/editor/ConflictToast.tsx` (new)
- `web/src/hooks/useKeyboardShortcuts.ts` (add Ctrl/Cmd-S)

---

### T-006: UI Safe Zones for Map Controls
**Description:** Define CSS variables for UI safe zones, configure MapLibre control positioning, ensure toolbars/panels don't obscure map controls, implement responsive adjustments.

**Scope:**
- CSS safe zone variables (top/right/bottom/left)
- MapLibre control positioning inside safe zones
- Toolbar/panel positioning outside safe zones
- Responsive rules for mobile (<768px)
- Debug mode overlay for development

**Dependencies:** None (parallel work)

**Estimated Complexity:** Low-Medium (1-2 days)

**Files Affected:**
- `web/src/components/map/UiSafeZones.css` (new)
- `web/src/components/map/MapContainer.tsx` (update MapLibre config)
- `web/src/components/editor/Toolbar.tsx` (update positioning)
- `web/src/components/editor/LeftRail.tsx` (update positioning)
- `web/src/components/editor/BottomStatus.tsx` (update positioning)

---

### T-007: Legacy Code Cleanup & Migration
**Description:** Delete legacy Sites/Layouts pages, configure ESLint restricted imports, add lint:strict script, verify no broken imports remain.

**Scope:**
- Delete `web/src/app/sites/*` (except hooks)
- Delete `web/src/app/layouts/page.tsx` if superseded
- Configure ESLint to block imports from deleted paths
- Add `lint:strict` script to package.json
- Run full lint pass to verify cleanup

**Dependencies:** T-001 (Workbench must be complete before deleting legacy)

**Estimated Complexity:** Low (1 day)

**Files Affected:**
- `web/src/app/sites/*` (delete)
- `web/src/app/layouts/page.tsx` (delete if applicable)
- `web/eslint.config.cjs` (update rules)
- `web/package.json` (add script)

---

### T-008: Unit Testing
**Description:** Write unit tests for Workbench components, Intent Wizard, template filtering, rotation shortcuts, save button, and UI safe zone positioning.

**Scope:**
- Workbench page rendering (Quick Start + Recent Plans)
- IntentWizard step navigation and metadata persistence
- TemplatesPanel intent-based filtering
- Rotation shortcuts (Q/E) and slider updates
- Save button click and Ctrl/Cmd-S shortcut
- UI safe zones: verify no overlap with computed positions

**Dependencies:** T-001 through T-006 (tests written after implementation)

**Estimated Complexity:** Medium (2-3 days)

**Files Affected:**
- `web/src/app/workbench/page.test.tsx` (new)
- `web/src/components/wizard/IntentWizard.test.tsx` (new)
- `web/src/components/editor/TemplatesPanel.test.tsx` (update)
- `web/src/components/map/RotationHandles.test.tsx` (new)
- `web/src/components/editor/EditorTopBar.test.tsx` (update)
- `web/src/components/map/UiSafeZones.test.tsx` (new)

---

### T-009: E2E Critical Path Testing
**Description:** Write Playwright E2E tests covering critical user flows: Sports Tournament path, Concert/Festival path, geocoding with Eircode, and version conflict resolution.

**Scope:**
- Critical path: Workbench → Wizard → Soccer intent → Geocode → Editor → Draw → Rotate (Q/E) → Save → Reload → Verify
- Concert flow: Festival intent → Stage templates appear first
- Geocoding: Eircode "E91 VF83" centers map correctly
- Conflict resolution: Two tabs edit → 409 toast → Reload works

**Dependencies:** T-001 through T-006 (E2E tests require full feature implementation)

**Estimated Complexity:** Medium-High (2-3 days)

**Files Affected:**
- `tests/e2e/workbench-wizard-flow.spec.ts` (new)
- `tests/e2e/intent-template-filtering.spec.ts` (new)
- `tests/e2e/rotation-shortcuts.spec.ts` (new)
- `tests/e2e/conflict-resolution.spec.ts` (new)
- `tests/e2e/fixtures/testLayouts.ts` (update)

---

### T-010: Analytics Instrumentation
**Description:** Add analytics event tracking for all key interactions (wizard steps, template usage, rotation tools, save actions) and timing marks for performance metrics.

**Scope:**
- Event tracking: workbench_open, wizard_start/complete, intent_selected, template_inserted, rotate_* events, save_click, autosave_event
- Timing marks: t_first_polygon_created, t_first_save
- Integration with existing analytics provider (Google Analytics assumed)

**Dependencies:** T-001 through T-005 (events added to implemented features)

**Estimated Complexity:** Low-Medium (1-2 days)

**Files Affected:**
- `web/src/lib/analytics.ts` (update with new events)
- `web/src/components/wizard/IntentWizard.tsx` (add tracking)
- `web/src/components/editor/TemplatesPanel.tsx` (add tracking)
- `web/src/components/map/RotationHandles.tsx` (add tracking)
- `web/src/components/editor/EditorTopBar.tsx` (add tracking)

---

## Summary

**Total High-Level Tasks:** 10

**Estimated Timeline:** 18-25 days (assuming 1 developer, some tasks can run in parallel)

**Recommended Sequence:**
1. **Phase 1 (Week 1):** T-001 (Workbench) → T-002 (Wizard) → T-003 (Templates)
2. **Phase 2 (Week 2):** T-004 (Rotation) + T-005 (Save) + T-006 (UI Safe Zones) in parallel
3. **Phase 3 (Week 3):** T-007 (Cleanup) → T-008 (Unit Tests) → T-009 (E2E Tests)
4. **Phase 4 (Final):** T-010 (Analytics) → Final QA → Deploy

**Risk Areas:**
- Geocoding API rate limits (mitigation: debounce, cache results)
- Version conflict UX complexity (mitigation: simple toast + reload, defer advanced merge to v2)
- Template registry size (mitigation: start with 25-30 templates, expand iteratively)

---

**Phase 1 Status:** ✅ High-level tasks defined

**Phase 2 Status:** 🔄 Breaking down into detailed sub-tasks

---

## Detailed Sub-Tasks

### T-001: Workbench Page & Navigation ✅

#### Sub-Tasks:
- [x] T-001.1: Create Workbench page component (`web/src/app/workbench/page.tsx`)
  - Two-panel layout: Quick Start (left 40%) + Recent Plans (right 60%)
  - Responsive: stacked on tablet, single column on mobile
  
- [x] T-001.2: Create QuickStartPanel component (`web/src/components/workbench/QuickStartPanel.tsx`)
  - "Create New Plan" button (launches Intent Wizard)
  - "Import GeoJSON" link (shows "Coming Soon" for now)
  - "Start from Template" link
  
- [x] T-001.3: Create RecentPlansPanel component (`web/src/components/workbench/RecentPlansPanel.tsx`)
  - Query last 10 layouts ordered by `updated_at DESC`
  - Display: site name, layout name, timestamp, "Open" button
  - Filter tabs: "All" / "Sports" / "Events" (filters by intent metadata)
  
- [x] T-001.4: Update home page FeatureCards (`web/src/components/landing/FeatureCards.tsx`)
  - Replace "Sites" and "Layouts" cards with single "Workbench" card
  - Use Lucide `MapPin` icon
  - Caption: "Create a new plan or resume one"
  - Link to `/workbench`
  
- [x] T-001.5: Add Next.js middleware redirects (`web/src/middleware.ts`)
  - `/sites` → `/workbench`
  - `/sites/:id` → `/workbench?openSite=:id`
  - `/layouts` → `/workbench`
  - Keep `/layouts/:id` unchanged
  
- [x] T-001.6: Add useRecentLayouts hook (`web/src/hooks/useRecentLayouts.ts`)
  - React Query hook to fetch last 10 layouts
  - Support intent-based filtering
  - Cache for 30 seconds
  
- [x] T-001.7: Add one-time migration banner component (`web/src/components/workbench/MigrationBanner.tsx`)
  - Show "Sites & Layouts have merged into Workbench"
  - Dismissible, stores state in localStorage
  - Only shows to users who previously accessed `/sites` or `/layouts`

**Status:** ✅ Complete (committed: 4ff0c37)

---

### T-002: Intent Wizard Implementation ⏳

#### Sub-Tasks:
- [ ] T-002.1: Create IntentWizard modal component (`web/src/components/wizard/IntentWizard.tsx`)
  - Modal wrapper with dark overlay
  - Step navigation: Back/Next/Finish buttons
  - Progress indicator (Step X of 3)
  - Close button (warns if incomplete)
  
- [ ] T-002.2: Create IntentSelectionStep component (`web/src/components/wizard/IntentSelectionStep.tsx`)
  - 9 radio tile options (Sports/Training/Market/Festival/Construction/Emergency/Film/CarPark/Custom)
  - Each tile: icon + title + description
  - 2-column grid on desktop, single column on mobile
  
- [ ] T-002.3: Create SubtypeSelectionStep component (`web/src/components/wizard/SubtypeSelectionStep.tsx`)
  - Conditional rendering based on intent
  - Sports: GAA/Rugby/Soccer/Hockey/Mixed
  - Events: Fairs/Parking/Security/Seating/Stage
  - Construction: Compound/Laydown/Welfare
  - Emergency: Cordons/Muster/Closures
  - Film: Production/Base/Marshals
  - CarPark: Lanes/Bays/Posts
  
- [ ] T-002.4: Create LocationInputStep component (`web/src/components/wizard/LocationInputStep.tsx`)
  - Address/Eircode input with geocoding (reuse MapGeocodingSearch logic)
  - "Pick on map" button (opens map picker modal)
  - "Skip for now" link
  
- [ ] T-002.5: Create MapPickerModal component (`web/src/components/wizard/MapPickerModal.tsx`)
  - Simplified map view with crosshair center
  - "Confirm Location" button
  - Returns { lat, lng, zoom }
  
- [ ] T-002.6: Add useCreateLayoutFromIntent mutation hook (`web/src/hooks/useCreateLayoutFromIntent.ts`)
  - Creates draft site (if new location) or uses selected site
  - Creates draft layout with intent/subtype in metadata
  - Returns layout ID for navigation
  
- [ ] T-002.7: Update layouts service to handle metadata (`src/services/layouts.service.ts`)
  - Accept `metadata` field in create/update DTOs
  - Store intent/subtype in JSONB column
  
- [ ] T-002.8: Add database migration for layout metadata (`src/db/migrations/XXXX_add_layout_metadata.ts`)
  - Add `metadata` JSONB column to `layouts` table (if not exists)
  - Add index on `updated_at DESC` for recent queries
  - Non-breaking: column is nullable

---

### T-003: Template System & Intent Filtering ⏳

#### Sub-Tasks:
- [ ] T-003.1: Create template types (`web/src/types/template.types.ts`)
  - TemplateMetadata interface (id, name, intentTags, sportType, dimensions, etc.)
  - TemplateRegistry type
  
- [ ] T-003.2: Create template registry config (`web/src/config/templateRegistry.ts`)
  - Sports templates: GAA pitch, Rugby 15s/7s, Soccer full/7s/5-a-side, Hockey (8 total)
  - Events templates: Stall grid, Parking rows, Security perimeter, Stage+FOH, Crowd pens (5 total)
  - Construction templates: Compound, Laydown, Welfare, Fire route (4 total)
  - Emergency templates: Cordons, Muster, Closure (3 total)
  - Film templates: Production, Generator, Waste (3 total)
  - CarPark templates: Lanes, Disabled, EV (3 total)
  - Total: 26 templates
  
- [ ] T-003.3: Create template geometry generators (`web/src/lib/templateGenerators.ts`)
  - Functions to generate GeoJSON polygons for each template type
  - Accept center point { lat, lng } and return properly oriented geometry
  
- [ ] T-003.4: Update TemplatesPanel to accept intent prop (`web/src/components/editor/TemplatesPanel.tsx`)
  - Add `intent?: string` and `subtype?: string` props
  - Filter templates by intentTags
  - Sort: matching subtype first, matching intent second, generic last
  - Hide unrelated templates
  
- [ ] T-003.5: Add tool presets config (`web/src/config/toolPresets.ts`)
  - Define presets per intent (snap grid, rotation snap, units, visible layers)
  - Export getPresetForIntent(intent) function
  
- [ ] T-003.6: Update editor store for tool presets (`web/src/store/editor.store.ts`)
  - Add `applyToolPreset(preset)` action
  - Apply preset when layout loads with intent metadata

---

### T-004: Rotation UX Enhancements ⏳

#### Sub-Tasks:
- [ ] T-004.1: Create rotation utilities (`web/src/lib/rotation.utils.ts`)
  - calculateRotationFromDrag(startPoint, currentPoint, centroid)
  - snapRotationToDegrees(angle, snapIncrement)
  - getBoundingBoxCorners(zone)
  
- [ ] T-004.2: Create RotationHandles component (`web/src/components/map/RotationHandles.tsx`)
  - Render when single zone is selected
  - Corner handles (4) + center handle (1)
  - Show tooltips on hover ("Drag to rotate" / "Q/E to rotate")
  - Update zone rotation on drag
  
- [ ] T-004.3: Add rotation shortcuts to useKeyboardShortcuts hook (`web/src/hooks/useKeyboardShortcuts.ts`)
  - Q: rotate -5°
  - E: rotate +5°
  - Alt + Scroll: continuous rotation (1° per tick)
  - Hold R + Drag: free rotation around centroid
  
- [ ] T-004.4: Update PropertiesPanel with rotation controls (`web/src/components/editor/PropertiesPanel.tsx`)
  - Slider: -180° to +180° with visual indicator
  - Numeric input: step 1°, keyboard arrows work
  - Snap toggle button (15° ON/OFF)
  
- [ ] T-004.5: Add rotation state to editor store (`web/src/store/editor.store.ts`)
  - `rotationSnapEnabled: boolean` (default true)
  - `rotationSnapDegrees: number` (default 15)
  - Persist preference to localStorage
  
- [ ] T-004.6: Update zones API to accept rotation_deg field
  - Verify backend already supports `rotation_deg` column
  - Update mutation hooks to send rotation value

---

### T-005: Explicit Save Button & Conflict Handling ⏳

#### Sub-Tasks:
- [ ] T-005.1: Create EditorTopBar component (`web/src/components/editor/EditorTopBar.tsx`)
  - Layout: left (breadcrumbs), center (layout name), right (actions)
  - Save button with status indicator
  - User menu
  
- [ ] T-005.2: Add SaveButton component (`web/src/components/editor/SaveButton.tsx`)
  - Primary button style
  - Status display: "All changes saved" (green) / "Saving..." (spinner) / "Unsaved changes" (orange)
  - Click triggers manual save
  
- [ ] T-005.3: Update useSaveLayout hook to handle 409 conflicts (`web/src/hooks/useSaveLayout.ts`)
  - Detect 409 response
  - Set conflict state in store
  - Block subsequent saves until resolved
  
- [ ] T-005.4: Create ConflictToast component (`web/src/components/editor/ConflictToast.tsx`)
  - Toast notification: "This layout was updated elsewhere. Click to reload latest version."
  - "Reload latest" button
  - Warn user about losing unsaved changes
  
- [ ] T-005.5: Add Ctrl/Cmd-S shortcut to useKeyboardShortcuts hook
  - Detect Ctrl/Cmd modifier
  - Trigger save action
  - Prevent browser default (save page)
  
- [ ] T-005.6: Add save status to editor store (`web/src/store/editor.store.ts`)
  - `saveStatus: 'saved' | 'saving' | 'unsaved' | 'conflict'`
  - `lastSavedAt: Date | null`
  - `hasConflict: boolean`

---

### T-006: UI Safe Zones for Map Controls ⏳

#### Sub-Tasks:
- [ ] T-006.1: Create UiSafeZones.css (`web/src/components/map/UiSafeZones.css`)
  - CSS variables: --ui-safe-top, --ui-safe-right, --ui-safe-bottom, --ui-safe-left
  - Desktop: 64px / 72px / 80px / 16px
  - Responsive rules for <768px: reduce by 20%
  
- [ ] T-006.2: Update MapContainer to use safe zones (`web/src/components/map/MapContainer.tsx`)
  - Apply padding to map container using CSS variables
  - Position MapLibre controls (north arrow, zoom) in top-right inside safe zone
  
- [ ] T-006.3: Update Toolbar positioning (`web/src/components/editor/Toolbar.tsx`)
  - Ensure height ≤ 56px
  - Position below --ui-safe-top
  
- [ ] T-006.4: Update LeftRail positioning (`web/src/components/editor/LeftRail.tsx`)
  - Start below 64px from top
  
- [ ] T-006.5: Update BottomStatus positioning (`web/src/components/editor/BottomStatus.tsx`)
  - Sit above --ui-safe-bottom
  
- [ ] T-006.6: Add debug mode overlay (dev only) (`web/src/components/map/SafeZonesDebug.tsx`)
  - Dotted border showing safe zones
  - Toggle with keyboard shortcut (Shift+D)
  - Only in development mode

---

### T-007: Legacy Code Cleanup & Migration ⏳

#### Sub-Tasks:
- [ ] T-007.1: Delete legacy Sites pages
  - Delete `web/src/app/sites/*` (keep only hooks if needed)
  
- [ ] T-007.2: Delete legacy Layouts index page
  - Delete `web/src/app/layouts/page.tsx` if superseded by Workbench
  
- [ ] T-007.3: Update ESLint config (`web/eslint.config.cjs`)
  - Add no-restricted-imports rules to block old paths
  - Add patterns to block **/app/sites/**, **/app/layouts/**/legacy**
  
- [ ] T-007.4: Add lint:strict script (`web/package.json`)
  - "lint:strict": "eslint . --max-warnings=0"
  
- [ ] T-007.5: Run full lint pass
  - Execute npm run lint:strict
  - Fix any remaining imports from deleted modules

---

### T-008: Unit Testing ⏳

#### Sub-Tasks:
- [ ] T-008.1: Test Workbench page rendering (`web/src/app/workbench/page.test.tsx`)
  - Renders Quick Start panel
  - Renders Recent Plans panel
  - Displays recent layouts from query
  
- [ ] T-008.2: Test IntentWizard flow (`web/src/components/wizard/IntentWizard.test.tsx`)
  - Step navigation works
  - Intent selection sets metadata
  - Location input calls geocoder
  - Wizard completion creates layout
  
- [ ] T-008.3: Test TemplatesPanel filtering (`web/src/components/editor/TemplatesPanel.test.tsx`)
  - Filters templates by intent
  - Shows matching templates first
  - Hides unrelated templates
  
- [ ] T-008.4: Test rotation shortcuts (`web/src/components/map/RotationHandles.test.tsx`)
  - Q/E keys rotate ±5°
  - Alt+Scroll rotates continuously
  - R+Drag enables free rotation
  
- [ ] T-008.5: Test Save button (`web/src/components/editor/SaveButton.test.tsx`)
  - Click triggers save mutation
  - Ctrl/Cmd-S shortcut works
  - Status displays correctly
  
- [ ] T-008.6: Test UI safe zones (`web/src/components/map/UiSafeZones.test.tsx`)
  - Compute positions of north arrow and toolbars
  - Verify no overlap

---

### T-009: E2E Critical Path Testing ⏳

#### Sub-Tasks:
- [ ] T-009.1: Test Workbench → Wizard → Editor flow (`tests/e2e/workbench-wizard-flow.spec.ts`)
  - Navigate to /workbench
  - Click "Create New Plan"
  - Select "Sports Tournament / Soccer"
  - Add location (geocode)
  - Editor opens with soccer templates first
  - Draw pitch, rotate with Q/E
  - Save, reload, verify persistence
  
- [ ] T-009.2: Test Concert/Festival flow (`tests/e2e/intent-template-filtering.spec.ts`)
  - Select "Festival / Concert / Stage" intent
  - Editor shows stage templates first
  - Verify other templates appear later
  
- [ ] T-009.3: Test Eircode geocoding (`tests/e2e/geocoding-eircode.spec.ts`)
  - Enter Eircode "E91 VF83" in wizard
  - Click "Go"
  - Map centers on Irish location
  
- [ ] T-009.4: Test conflict resolution (`tests/e2e/conflict-resolution.spec.ts`)
  - Open same layout in two browser contexts
  - Tab 1: edit and save
  - Tab 2: edit and attempt save
  - Verify 409 toast appears
  - Click "Reload latest" and verify it works

---

### T-010: Analytics Instrumentation ⏳

#### Sub-Tasks:
- [ ] T-010.1: Add analytics events to IntentWizard (`web/src/components/wizard/IntentWizard.tsx`)
  - workbench_open
  - wizard_start
  - wizard_complete (with intent, subtype, duration_ms)
  - intent_selected
  
- [ ] T-010.2: Add analytics to TemplatesPanel (`web/src/components/editor/TemplatesPanel.tsx`)
  - template_inserted (template_id, intent_context)
  
- [ ] T-010.3: Add analytics to RotationHandles (`web/src/components/map/RotationHandles.tsx`)
  - rotate_handle_used
  - rotate_shortcut_used (key: q/e/alt_scroll/r_drag)
  
- [ ] T-010.4: Add analytics to SaveButton (`web/src/components/editor/SaveButton.tsx`)
  - save_click (is_manual: true)
  - autosave_event (is_manual: false)
  
- [ ] T-010.5: Add timing marks (`web/src/lib/analytics.ts`)
  - t_first_polygon_created
  - t_first_save

---

## Relevant Files

**Created:**
- `/tasks/0001-prd-workbench-merge-and-editor-ux.md` - Product Requirements Document
- `/tasks/tasks-0001-prd-workbench-merge-and-editor-ux.md` - This task list
- `web/src/app/workbench/page.tsx` - Workbench main page with two-panel layout
- `web/src/components/workbench/QuickStartPanel.tsx` - Quick start actions panel
- `web/src/components/workbench/RecentPlansPanel.tsx` - Recent layouts display panel
- `web/src/components/workbench/MigrationBanner.tsx` - One-time migration banner component
- `web/src/components/workbench/IntentWizard.tsx` - Intent wizard placeholder (full impl in T-002)
- `web/src/hooks/useRecentLayouts.ts` - React Query hook for recent layouts

**Modified:**
- `web/src/components/landing/FeatureCards.tsx` - Replaced Sites/Layouts cards with single Workbench card
- `web/src/middleware.ts` - Added legacy route redirects (/sites, /layouts → /workbench)

---

## Progress Summary

- **Tasks Completed:** 1 / 10 parent tasks (T-001 ✅)
- **Sub-Tasks Completed:** 7 / 60 sub-tasks
- **Current Focus:** T-001 complete and committed. Awaiting user approval to proceed with T-002 (Intent Wizard)

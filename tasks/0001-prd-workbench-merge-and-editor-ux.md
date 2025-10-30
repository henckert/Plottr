# PRD-0001: Workbench Merge & Editor UX Improvements

## Introduction/Overview

Currently, PlotIQ presents users with separate "Sites" and "Layouts" entry points on the home page, which creates confusion and increases friction for first-time users trying to start their first plan. This feature merges both entry points into a unified "Workbench" hub that combines Quick Start actions with recent work, introduces an Intent Wizard to guide users from idea to first layout in under 2 minutes, and enhances the editor with discoverable rotation tools, explicit save controls, and conflict-free UI positioning.

**Problem:** Users are confused by separate Sites/Layouts navigation, don't know where to start, can't quickly resume work, and the current editor lacks discoverability for key operations (rotation, saving).

**Goal:** Reduce time from landing to first saved layout by 40%, increase template usage by 50%, and eliminate "where do I start" support tickets by 60%.

## Goals

1. **Simplify Entry Experience:** Single unified "Workbench" hub replaces Sites + Layouts navigation
2. **Reduce Time-to-First-Layout:** From idea to first saved polygon in < 2 minutes (median)
3. **Improve Template Discoverability:** Intent-driven template filtering shows relevant presets first
4. **Make Rotation Obvious:** Handles + keyboard shortcuts + slider all discoverable
5. **Explicit Save State:** Clear save button + Ctrl/Cmd-S + visible autosave status
6. **Conflict-Free UI:** Map controls never obscured by toolbars/panels

## User Stories

### Primary Users (First-Time)

**US-1:** As a first-time user planning a soccer tournament, I want to be guided through intent selection so that I see relevant soccer templates first without browsing all options.

**US-2:** As a user with a site address, I want to type it once and have the map center on my location so that I can start drawing immediately.

**US-3:** As a user unfamiliar with the editor, I want to discover rotation tools easily (handles + keyboard hints) so that I don't get stuck trying to rotate a pitch.

### Secondary Users (Returning/Power)

**US-4:** As a returning user, I want to see my recent plans prominently so that I can resume work in one click.

**US-5:** As a power user creating multiple layouts, I want Quick Start actions (no wizard) so that I'm not slowed down by steps I don't need.

**US-6:** As a user editing collaboratively, I want to see explicit save status and handle version conflicts gracefully so that I don't lose work.

## Functional Requirements

### 1. Workbench Page & Navigation

**FR-1.1:** The home page SHALL display a single "Workbench" card replacing the current "Sites" and "Layouts" cards.

**FR-1.2:** The Workbench card SHALL use the Lucide `MapPin` icon and caption "Create a new plan or resume one".

**FR-1.3:** The Workbench page (`/workbench`) SHALL contain two panels: Quick Start (left) and Recent Plans (right).

**FR-1.4:** Quick Start panel SHALL display:
- Primary button: "Create New Plan" (launches Intent Wizard)
- Secondary link: "Import GeoJSON"
- Secondary link: "Start from Template"

**FR-1.5:** Recent Plans panel SHALL display:
- Last 10 layouts ordered by `updated_at DESC`
- Each item shows: site name, layout name, last updated timestamp, "Open" button
- Filter tabs: "All" / "Sports" / "Events" (filters by intent metadata)

**FR-1.6:** Legacy routes SHALL redirect:
- `/sites` → `/workbench`
- `/sites/:id` → `/workbench?openSite=:id` (auto-opens site detail drawer)
- `/layouts` → `/workbench`
- `/layouts/:id` remains unchanged

**FR-1.7:** First-time users SHALL see Intent Wizard by default; returning users SHALL see last used option (wizard or quick start).

**FR-1.8:** A one-time banner SHALL display: "Sites & Layouts have merged into Workbench" for users who previously accessed `/sites` or `/layouts`.

### 2. Intent Wizard

**FR-2.1:** Intent Wizard SHALL be a 3-step modal component (`IntentWizard.tsx`).

**FR-2.2:** Step 1 - Intent Selection SHALL display radio tile options:
1. Sports Tournament / League Round
2. Sports Day / Training
3. Market / Stalls / Fair
4. Festival / Concert / Stage
5. Construction / Temporary Works
6. Emergency / Safety Planning
7. Film / TV Unit Base
8. Car-Park Operations / Traffic
9. Custom

**FR-2.3:** Step 2 - Subtype (conditional) SHALL show based on intent:
- **Sports:** GAA / Rugby / Soccer / Hockey / Mixed
- **Events:** Fairs & Stalls / Parking / Security / Seating / Stage
- **Construction:** Site Compound / Laydown Area / Welfare Facilities
- **Emergency:** Cordons / Muster Points / Road Closures
- **Film:** Production Zones / Unit Base / Parking Marshals
- **Car-Park:** Lane Configuration / Disabled/EV Bays / Counting Posts
- **Other intents:** Skip to Step 3

**FR-2.4:** Step 3 - Location SHALL provide:
- Address/Eircode input with "Go" button (uses geocoding API)
- "Pick on map" button (opens map picker modal)
- "Skip for now" link (proceeds without location)

**FR-2.5:** If location is skipped:
- Map centers on last used area, or user's geolocation, or Dublin fallback
- Banner displays: "Add a location to improve template placement" (dismissible)

**FR-2.6:** On wizard completion, the system SHALL:
- Create a draft site (if new location) or use selected site
- Create a draft layout linked to that site
- Store `intent` and `subtype` in layout metadata JSON
- Navigate to `/layouts/:id/editor?intent=<intent>&subtype=<subtype>`

### 3. Template Filtering by Intent

**FR-3.1:** `TemplatesPanel` SHALL accept optional `intent` and `subtype` props.

**FR-3.2:** When intent is provided, templates SHALL be filtered and sorted:
- Templates matching intent shown first
- Templates matching subtype shown at top
- Generic templates shown last
- Unrelated templates hidden

**FR-3.3:** Template registry SHALL include metadata:
- `intentTags: string[]` (e.g., `['sports', 'soccer', 'tournament']`)
- `sportType?: string` (e.g., `'soccer'`)
- `eventType?: string` (e.g., `'stage'`)
- `dimensions: { width_m: number, length_m: number }`
- `geoGenerator?: string` (reference to generator function)

**FR-3.4:** Minimum template sets SHALL be provided:
- **Sports:** GAA pitch, Rugby 15s/7s, Soccer full/7s/5-a-side, Hockey pitch (8 total)
- **Events:** Stall grid, Parking rows, Security perimeter, Stage + FOH, Crowd pens (5 total)
- **Construction:** Site compound, Laydown grid, Welfare rectangle, Fire route (4 total)
- **Emergency:** Cordon rings, Muster point marker, Road closure barrier (3 total)
- **Film:** Production zone, Generator placement, Waste area (3 total)
- **Car-Park:** Lane markers, Disabled bay, EV charging bay (3 total)

**FR-3.5:** Template registry SHALL be stored in TypeScript (`web/src/config/templateRegistry.ts`) with future migration path to database.

### 4. Tool Presets by Intent

**FR-4.1:** Editor store SHALL include `toolPreset` based on intent:
- `defaultUnits: 'metric' | 'imperial'` (all intents use `'metric'`)
- `defaultSnapGrid: 0.5 | 1 | 5` meters
- `defaultRotationSnap: 5 | 15 | 45` degrees
- `visibleLayers: string[]` (e.g., `['lines', 'zones', 'labels']`)

**FR-4.2:** Tool presets by intent:
- **Sports:** snap 1m, rotation snap 15°, layers: lines + zones
- **Markets/Fairs:** snap 1m, rotation snap 0° (free), layers: grid + power points
- **Festivals/Concerts:** snap 5m, rotation snap 15°, layers: barriers + zones + ingress
- **Construction:** snap 0.5m, rotation snap 0° (free), layers: fencing + fire routes
- **Emergency:** snap 5m, rotation snap 15°, layers: cordons + muster + diversions
- **Film:** snap 1m, rotation snap 0° (free), layers: production + parking
- **Car-Park:** snap 0.5m, rotation snap 15°, layers: lanes + bays + arrows

### 5. Rotation UX Improvements

**FR-5.1:** When a zone/polygon is selected, rotation handles SHALL appear:
- Small circular handles at each corner of bounding box
- One larger circular handle at center for free rotation
- Cursor changes to rotation icon when hovering handles

**FR-5.2:** Keyboard shortcuts SHALL be implemented:
- **Q:** Rotate -5° (counter-clockwise)
- **E:** Rotate +5° (clockwise)
- **Alt + Scroll:** Continuous rotation (1° per scroll tick)
- **Hold R + Drag:** Free rotation around centroid

**FR-5.3:** Properties panel SHALL include rotation controls:
- Slider: -180° to +180° with visual indicator
- Numeric input: step 1°, keyboard +/- arrows work
- Snap toggle button: 15° snap ON/OFF (remembers last preference)

**FR-5.4:** Rotation snap preference SHALL be persisted in `editorStore.rotationSnapEnabled` and `editorStore.rotationSnapDegrees`.

**FR-5.5:** Default rotation snap SHALL be 15° ON for first-time users.

**FR-5.6:** All rotation operations SHALL update the zone's `rotation_deg` field in the database.

### 6. Explicit Save Button & Keyboard Shortcut

**FR-6.1:** Editor top bar SHALL display a "Save" button (primary style) next to other actions.

**FR-6.2:** Save status SHALL be shown adjacent to button:
- "All changes saved" (green checkmark icon)
- "Saving..." (spinner icon)
- "Unsaved changes" (orange dot icon)

**FR-6.3:** Keyboard shortcut **Ctrl/Cmd-S** SHALL trigger save action.

**FR-6.4:** Autosave SHALL continue running every 8 seconds in the background.

**FR-6.5:** Save button SHALL trigger immediate save (flush pending changes).

**FR-6.6:** On save success, the system SHALL:
- Update `version_token` for layout and affected zones
- Update `updated_at` timestamp
- Show "All changes saved" status

**FR-6.7:** On version conflict (409 response), the system SHALL:
- Display toast notification: "This layout was updated elsewhere. Click to reload latest version."
- Show "Resolve conflict" button in save status area
- Allow user to continue editing but block Save until conflict resolved
- "Resolve conflict" button reloads layout and shows diff (if changes exist locally)

**FR-6.8:** If user clicks "Reload latest version", any unsaved local changes SHALL be lost (warn user first).

### 7. UI Safe Zones for Map Controls

**FR-7.1:** A new CSS file `web/src/components/map/UiSafeZones.css` SHALL define CSS variables:
```css
:root {
  --ui-safe-top: 64px;
  --ui-safe-right: 72px;
  --ui-safe-bottom: 80px;
  --ui-safe-left: 16px;
}
```

**FR-7.2:** Map container SHALL use safe zone padding so MapLibre reserves space for controls.

**FR-7.3:** MapLibre controls (north arrow, zoom cluster) SHALL be positioned in top-right corner inside safe zone.

**FR-7.4:** Toolbars and panels SHALL be positioned outside safe zones:
- Top bar: height ≤ 56px, content below `--ui-safe-top`
- Left dock: starts below 64px from top
- Bottom hint banner: sits above `--ui-safe-bottom`
- Right panels: respect `--ui-safe-right` margin

**FR-7.5:** Responsive rules for small viewports (< 768px):
- Reduce safe zones by 20%: `--ui-safe-top: 52px`, `--ui-safe-right: 56px`, etc.
- Make left/right panels collapsible/overlay
- Show passive hint: "Best experience on desktop" (if width < 360px)

**FR-7.6:** No toolbar, panel, or overlay SHALL obscure map controls (north arrow, zoom buttons, attribution).

### 8. Code Cleanup & Migration

**FR-8.1:** The following directories SHALL be deleted:
- `web/src/app/sites/*` (except API hooks in `web/src/hooks/useSites.ts`)
- Legacy "Create Layout" splash component (if exists)

**FR-8.2:** The file `web/src/app/layouts/page.tsx` (layouts index list) SHALL be deleted if superseded by Workbench recent list.

**FR-8.3:** ESLint configuration (`web/eslint.config.cjs`) SHALL include:
```javascript
rules: {
  'no-restricted-imports': ['error', {
    paths: [
      { name: '@/app/sites/page', message: 'Use /workbench' },
      { name: '@/app/layouts/page', message: 'Use /workbench' },
    ],
    patterns: [
      '**/app/sites/**',
      '**/app/layouts/**/legacy**',
    ],
  }],
}
```

**FR-8.4:** Package.json SHALL include new script:
```json
"lint:strict": "eslint . --max-warnings=0"
```

**FR-8.5:** No imports from deleted modules SHALL remain in codebase.

### 9. Testing Requirements

**FR-9.1:** Unit tests SHALL cover:
- Workbench page renders Quick Start + Recent Plans
- IntentWizard sets intent in metadata
- TemplatesPanel filters by intent correctly
- Rotation shortcuts (Q/E) adjust `rotation_deg`
- Rotation slider updates zone rotation
- Save button triggers mutation
- Ctrl/Cmd-S keyboard shortcut calls save
- UI safe zones: north arrow and toolbars don't overlap (computed positions)

**FR-9.2:** E2E tests (Playwright) SHALL cover:
- **Critical Path:** Workbench → "Create New Plan" → Select "Sports Tournament / Soccer" → Add location → Editor opens with soccer templates → Draw pitch → Rotate with Q/E → Save → Reload → Verify saved
- **Concert Flow:** Workbench → "Create New Plan" → Select "Festival / Concert / Stage" → Editor shows stage/crowd templates first
- **Geocoding:** Workbench → Wizard → Enter Eircode "E91 VF83" → "Go" → Map centers on Irish location
- **Conflict Resolution:** Two tabs edit same layout → Tab 1 saves → Tab 2 attempts save → 409 toast appears → "Reload latest" works

**FR-9.3:** Test data SHALL use:
- Mix of mocks/fixtures for unit tests
- Test database for E2E API tests

### 10. Analytics & Instrumentation

**FR-10.1:** The following events SHALL be tracked:
- `workbench_open` (timestamp)
- `wizard_start` (timestamp)
- `wizard_complete` (intent, subtype, duration_ms)
- `intent_selected` (intent, subtype)
- `template_inserted` (template_id, intent_context)
- `rotate_handle_used` (zone_id)
- `rotate_shortcut_used` (key: 'q' | 'e' | 'alt_scroll' | 'r_drag')
- `save_click` (is_manual: true)
- `autosave_event` (is_manual: false)

**FR-10.2:** Timing marks SHALL be recorded:
- `t_first_polygon_created` (from landing to first drawn polygon)
- `t_first_save` (from landing to first save action)

**FR-10.3:** Analytics SHALL be sent to existing analytics provider (assume Google Analytics or similar).

## Non-Goals (Out of Scope)

**NG-1:** Multi-user live collaboration (concurrent editing with CRDTs) - version conflict detection only.

**NG-2:** Advanced template editor (users cannot create custom templates in v1).

**NG-3:** Mobile app (responsive web only; native iOS/Android out of scope).

**NG-4:** Offline mode (requires network connection).

**NG-5:** Undo/Redo for rotation (future enhancement).

**NG-6:** 3D visualization or terrain elevation (2D maps only).

**NG-7:** Custom intent creation (fixed list of 9 intents for v1).

**NG-8:** Template marketplace or sharing (future).

## Design Considerations

### Workbench Page Layout

- **Desktop (≥1024px):** Two-column layout, 40% Quick Start / 60% Recent Plans
- **Tablet (768-1023px):** Two-column stacked, Quick Start above Recent
- **Mobile (<768px):** Single column, Quick Start first, Recent below (limit to 5 items)

### Intent Wizard Modal

- **Style:** Center modal, max-width 640px, dark overlay
- **Navigation:** "Back" / "Next" / "Finish" buttons at bottom
- **Step indicator:** Progress dots (Step 1 of 3)
- **Tiles:** Radio cards with icon + title + description (2-column grid on desktop)

### Rotation Handles

- **Visual:** Small circles (12px diameter), white fill, dark border, shadow
- **Center handle:** Larger (20px), rotate cursor
- **Hover state:** Scale 1.2x, show tooltip "Drag to rotate" or "Q/E to rotate"

### Save Button

- **Style:** Primary button (blue), icon + "Save" label
- **Status:** Small text below or inline, color-coded (green/orange/gray)
- **Position:** Top-right of editor bar, before user menu

### UI Safe Zones

- **Visual Debug Mode (dev only):** Dotted border overlay showing safe zones
- **Toolbar transparency:** Panels use backdrop-blur for readability over map

## Technical Considerations

### Database Changes

- **NO breaking changes** - all new fields are optional or metadata JSON
- Add `layout.metadata` JSONB column if not exists (for `intent`, `subtype`)
- Add index on `layout.updated_at DESC` for recent plans query

### Dependencies

- **Existing:** MapLibre, Lucide icons, Tailwind, Zustand store
- **New (if needed):** None - use existing stack

### Performance

- **Debounce geocoding:** 300ms debounce on address input
- **Lazy-load template thumbnails:** Only load visible templates
- **Cap measurement updates:** Use `requestAnimationFrame` for live measurements during rotation

### Accessibility

- **Keyboard navigation:** All wizard steps, rotation, save accessible via keyboard
- **Focus rings:** Visible on all interactive elements
- **Color contrast:** AA compliant (4.5:1 minimum)
- **Screen reader:** ARIA labels on all icons, announce save status changes

### Browser Support

- **Modern browsers only:** Chrome/Edge/Firefox/Safari last 2 versions
- **No IE11 support**

## Success Metrics

### Primary

**M-1:** Time-to-first-layout ↓ 40% (median, from landing to first saved polygon)
- **Baseline:** ~5 minutes (assumed)
- **Target:** ~3 minutes

### Secondary

**M-2:** Template usage ↑ 50%
- **Baseline:** 30% of layouts use at least one template
- **Target:** 45% of layouts use at least one template

**M-3:** "Where do I start" support tickets ↓ 60%
- **Baseline:** ~10 tickets/month
- **Target:** ~4 tickets/month

**M-4:** CSAT score ≥ 4.3/5 for onboarding flow
- **Measure:** Post-wizard survey (optional, shown to 20% of users)

### Analytics KPIs

- Wizard completion rate ≥ 70% (users who start wizard and finish)
- Intent selection distribution (track which intents are most popular)
- Rotation tool usage: handles vs keyboard vs slider (% of each)
- Manual save clicks vs autosave events (should see ↑ manual saves as button is more obvious)

## Open Questions

**Q-1:** Should "Import GeoJSON" functionality be built in this release, or just show as "Coming Soon" link?
- **Answer:** Build import UI skeleton, show "Coming Soon" banner if backend not ready.

**Q-2:** What happens if geocoding API fails (rate limit, downtime)?
- **Answer:** Show error toast: "Geocoding unavailable. Enter coordinates manually or pick on map."

**Q-3:** Should rotation handles appear on multi-selection, or only single-selection?
- **Answer:** Single-selection only for v1. Multi-select shows bounds but no rotation handles.

**Q-4:** How to handle layouts created before Intent Wizard (no intent metadata)?
- **Answer:** Tag as `intent: 'custom'`, allow user to "Set Intent" retroactively from layout settings.

**Q-5:** Should template thumbnails be static images or dynamically rendered?
- **Answer:** Static SVG images for v1 (faster, cacheable). Dynamic rendering for future template editor.

---

**Document Version:** 1.0  
**Created:** 2025-10-30  
**Status:** Approved for Development  
**Target Release:** v2.0

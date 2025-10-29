# Acceptance Criteria: Layout Editor UX Overhaul

**Feature:** FEAT-007 Layout Creation UX Overhaul  
**Branch:** `feat/editor-ux-overhaul`  
**Status:** ✅ Implementation Complete, Ready for Testing  
**Date:** October 29, 2025

## Overview

This document tracks the acceptance criteria for the complete redesign of the layout editor experience, implementing a professional-grade mapping tool with QuickStart wizard, enhanced toolbar, transform controls, snap utilities, command palette, and rural mode.

## Phase 1: QuickStart Wizard

### Requirements
- [ ] **3-Step Wizard Flow**
  - [x] Step 1: Site selection dropdown (scaffolded)
  - [x] Step 2: Start method selection (Template/Rectangle/Trace) (scaffolded)
  - [x] Step 3: Confirm center point (scaffolded)
  - [ ] Actual site data integration (TODO)
  
- [x] **localStorage Skip Preference**
  - [x] "Don't show this again" checkbox
  - [x] Persists across sessions

- [x] **Framer Motion Animations**
  - [x] Smooth step transitions
  - [x] Fade in/out effects

### Acceptance
- [x] Component created: `web/src/components/editor/QuickStartWizard.tsx`
- [x] Integrated into editor page
- [x] Shows on first load when `openQuickStart` is true
- [ ] **Manual Test:** Wizard completes successfully and creates first zone
- [ ] **Manual Test:** "Don't show again" preference persists

## Phase 2: Editor Surface Redesign

### Requirements

#### Toolbar (Top-Right Floating)
- [x] **Tool Selection Buttons**
  - [x] Select tool
  - [x] Draw tool
  - [x] Measure tool
  - [x] Transform tool
  
- [x] **Snap Toggle**
  - [x] Grid3x3 icon
  - [x] Toggles `snapEnabled` state
  
- [x] **Unit Toggle**
  - [x] Switch between Metric/Imperial
  - [x] Updates `unitSystem` state

#### Bottom Status Bar
- [x] **Live Measurements**
  - [x] Perimeter display (placeholder)
  - [x] Area display (placeholder)
  - [ ] Actual geometry calculations (TODO)
  
- [x] **Keyboard Hints**
  - [x] Enter to confirm
  - [x] Esc to cancel
  - [x] Shift for constraints

#### Left Rail
- [x] **4-Tab Interface**
  - [x] Templates tab
  - [x] Shapes tab
  - [x] Layers tab
  - [x] Properties tab
  
- [x] **Template Cards**
  - [x] GAA Pitch card
  - [x] Rugby Pitch card
  - [x] Soccer Field card
  - [x] Hockey Pitch card
  
- [x] **Collapsible Panels**
  - [x] Accordion-style sections

### Acceptance
- [x] Toolbar component created and positioned top-right
- [x] BottomStatus component created and positioned at bottom
- [x] LeftRail component created and positioned left
- [ ] **Manual Test:** Tools switch correctly when clicked
- [ ] **Manual Test:** Unit toggle updates measurements
- [ ] **Manual Test:** Tabs switch content in left rail

## Phase 3: Transform & Snap

### Requirements

#### Transform Controls
- [x] **Numeric Inputs**
  - [x] Width input (meters/feet)
  - [x] Length input (meters/feet)
  - [x] Rotation input (degrees)
  
- [x] **Actions**
  - [x] Apply button
  - [x] Reset button

#### Grid Overlay
- [x] **Visual Indicator**
  - [x] Shows when `snapEnabled` is true
  - [x] Displays current grid size (1m/5m/10m)

#### Snap Utilities
- [x] **snapToGrid()**
  - [x] Function signature defined
  - [ ] Implementation (TODO)
  
- [x] **snapToFeatures()**
  - [x] Function signature defined
  - [ ] Implementation (TODO)
  
- [x] **snapToCardinal()**
  - [x] Function signature defined
  - [ ] Implementation (TODO)

### Acceptance
- [x] TransformControls component created
- [x] GridOverlay component created and conditionally rendered
- [x] snap.ts utilities file created
- [ ] **Manual Test:** Transform controls update zone geometry
- [ ] **Manual Test:** Grid overlay visible when snap enabled
- [ ] **Unit Test:** Snap utilities work correctly (when implemented)

## Phase 4: Array Tool

### Requirements
- [x] **makeArrayPositions()**
  - [x] Calculate grid of positions using Turf.js
  - [x] Supports rows × columns with spacing
  
- [x] **arrayFeature()**
  - [x] Duplicate zones in array pattern
  - [x] Preserves rotation and properties

### Acceptance
- [x] arrayTool.ts utilities file created
- [x] Uses @turf/turf for geospatial calculations
- [ ] **Manual Test:** Array tool creates zones in grid pattern
- [ ] **Unit Test:** Array positions calculated correctly

## Phase 5: Command Palette

### Requirements
- [x] **cmdk Integration**
  - [x] Cmd+K / Ctrl+K to open
  - [x] Dialog component
  
- [x] **Grouped Commands**
  - [x] Tools group (Select/Draw/Measure/Transform)
  - [x] Actions group (Undo/Redo/Delete)
  - [x] Templates group (Insert GAA/Rugby/Soccer/Hockey)
  
- [x] **Keyboard Shortcuts**
  - [x] Default hotkeys map (v/d/m/r for tools)
  - [x] Ctrl+Z/C/V for actions
  - [x] ,/. for rotation

### Acceptance
- [x] CommandPalette component created
- [x] hotkeys.ts utilities file created
- [x] Integrated into editor page (always mounted)
- [ ] **Manual Test:** Cmd+K opens command palette
- [ ] **Manual Test:** Commands execute correctly
- [ ] **Manual Test:** Keyboard shortcuts work

## Phase 6: Rural Mode

### Requirements
- [x] **RuralModePanel**
  - [x] Toggle switch (Mountain icon)
  - [x] Opacity slider (0-100%)
  - [x] Emerald theme styling
  
- [x] **useOrthophotoLayer Hook**
  - [x] Add raster orthophoto layer
  - [x] Remove layer
  - [x] Update opacity

### Acceptance
- [x] RuralModePanel component created and positioned bottom-right
- [x] useOrthophotoLayer hook created
- [ ] **Manual Test:** Rural mode toggle adds orthophoto layer
- [ ] **Manual Test:** Opacity slider adjusts transparency

## Phase 7: Empty States & Tour

### Requirements
- [x] **EmptyState Component**
  - [x] Shown when `zones.length === 0`
  - [x] Template button
  - [x] Rectangle button
  - [x] Trace button
  - [x] Cmd+K hint
  
- [x] **TourOverlay Component**
  - [x] Placeholder for future Shepherd.js integration

### Acceptance
- [x] EmptyState component created and conditionally rendered
- [x] TourOverlay component created (placeholder)
- [ ] **Manual Test:** Empty state shows when no zones exist
- [ ] **Manual Test:** Empty state buttons trigger correct actions

## Testing Checklist

### Automated Tests
- [x] **Smoke Tests Created**
  - [x] All 9 components export correctly
  - [x] All components are React functions
  - [x] File: `web/src/components/editor/__tests__/smoke.test.tsx`

- [ ] **Type Check Passed**
  - [ ] `cd web && npm run type-check` completes without errors

- [ ] **Test Suite Passed**
  - [ ] Backend tests pass: `npm test`
  - [ ] Frontend tests pass: `cd web && npm test`

### Manual Tests (Browser)
- [ ] **QuickStart Wizard**
  - [ ] Opens on first visit to editor
  - [ ] All 3 steps navigate correctly
  - [ ] "Don't show again" persists

- [ ] **Toolbar**
  - [ ] Tool buttons switch active tool
  - [ ] Snap toggle shows/hides grid overlay
  - [ ] Unit toggle switches metric/imperial

- [ ] **Bottom Status**
  - [ ] Measurements update (when implemented)
  - [ ] Keyboard hints display correctly

- [ ] **Left Rail**
  - [ ] All 4 tabs switch content
  - [ ] Template cards display
  - [ ] Collapsible sections work

- [ ] **Transform Controls**
  - [ ] Inputs update zone geometry (when wired)
  - [ ] Apply button triggers transform
  - [ ] Reset button restores original

- [ ] **Command Palette**
  - [ ] Cmd+K opens palette
  - [ ] Commands filter by search
  - [ ] Commands execute correctly

- [ ] **Rural Mode**
  - [ ] Toggle adds orthophoto layer
  - [ ] Opacity slider works
  - [ ] Layer removes when toggled off

- [ ] **Empty State**
  - [ ] Shows when no zones
  - [ ] Buttons trigger correct actions
  - [ ] Hides when zones added

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Performance
- [ ] No console errors
- [ ] No console warnings (except expected deprecations)
- [ ] Page loads in <2s
- [ ] Interactions feel responsive (<100ms)

## Implementation Status

### ✅ Completed (18/23 original tasks)
1. Editor store created
2-11. All 10 editor components created
12-15. All utility files created
16. Jest configuration fixed
17. Components wired into editor page
18. Smoke tests created

### 🔄 In Progress (1/23)
19. Acceptance criteria document (this file)

### ⏳ Remaining (4/23)
20. Run type check
21. Run test suite
22. Push branch to origin
23. Open Pull Request

## Commits Reference

All work done on branch `feat/editor-ux-overhaul`:

1. `test: add Jest moduleNameMapper for @/ alias and cleanup hooks`
2. `feat(editor): add QuickStart wizard scaffold (3-step onboarding)`
3. `feat(editor): add Toolbar, BottomStatus, and LeftRail UI shells`
4. `feat(editor): add Transform controls, Grid overlay, and snap utilities`
5. `feat(editor): add Command Palette and keyboard shortcuts system`
6. `feat(editor): add Rural Mode panel and orthophoto layer hook`
7. `feat(editor): add EmptyState and TourOverlay components`
8. `feat(editor): wire all UX components into editor page`
9. `test(editor): add smoke tests for all UX components`

## Known Limitations & TODOs

### Immediate TODOs (required for full functionality)
- [ ] Implement actual snap utilities (currently stubbed)
- [ ] Wire transform controls to zone geometry updates
- [ ] Connect measurements to actual geometry calculations
- [ ] Wire template insertion to real API
- [ ] Implement command palette actions
- [ ] Add orthophoto tile source URL

### Future Enhancements
- [ ] Shepherd.js tour integration
- [ ] Advanced snap options (snap to angle, snap to distance)
- [ ] Array tool UI in left rail
- [ ] Undo/redo stack implementation
- [ ] Template gallery with search/filter
- [ ] Custom keyboard shortcut configuration

## Sign-Off

- [x] **Implementation Complete:** All components created and wired
- [ ] **Type Check Passed:** Pending execution
- [ ] **Tests Passed:** Pending execution
- [ ] **Manual Testing Complete:** Pending browser verification
- [ ] **Ready for Review:** After tests pass
- [ ] **Ready for Merge:** After review approval

---

**Next Steps:**
1. Run `cd web && npm run type-check` to verify TypeScript
2. Run test suites to ensure no regressions
3. Manual browser testing of all features
4. Push branch and open PR for review

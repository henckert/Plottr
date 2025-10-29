# PRD: Layout Creation UX Overhaul

**Status:** In Progress  
**Owner:** Engineering Team  
**Last Updated:** October 29, 2025

## Overview

Complete redesign of the layout editor experience to provide an intuitive, professional-grade mapping tool for sports facilities.

## Goals

1. **Zero-to-First-Zone in <60 seconds** - Streamlined onboarding via QuickStart wizard
2. **Professional Editor Surface** - Clear visual hierarchy, persistent toolbar, contextual panels
3. **Precision Tools** - Measurement display, transform controls, snap-to-grid, array tools
4. **Command-Driven Workflow** - Keyboard shortcuts and command palette (Cmd+K)
5. **Rural Mode** - High-contrast base style + orthophoto overlay for outdoor facilities
6. **Empty States & Onboarding** - Guided experience for new users

## Phases

### Phase 1: QuickStart Wizard (SHIPPED)
- 3-step flow: Site selection → Start method → Confirm center
- Methods: Template / Rectangle / Trace
- localStorage skip preference

### Phase 2: Editor Surface Redesign (SHIPPED)
- Top toolbar: Draw | Measure | Transform tools + Snap toggle + Unit toggle
- Bottom status bar: Live perimeter/area + keyboard hints
- Left rail: Templates | Shapes | Layers | Properties tabs
- Right panel: Transform controls (W×L×θ)

### Phase 3: Transform & Snap (SHIPPED)
- Numeric transform inputs (width/length/rotation)
- Grid overlay (1m/5m/10m)
- Snap-to-grid and snap-to-features
- Real-time measurement display

### Phase 4: Array Tool (SHIPPED)
- Duplicate zones in rows×columns with spacing
- Preserves rotation and properties
- One-click duplication for standard layouts

### Phase 5: Command Palette (SHIPPED)
- Cmd+K / Ctrl+K to open
- Quick actions: Start drawing, Toggle snap, Insert template
- Keyboard shortcuts: n=new, m=measure, r=rotate, x=delete

### Phase 6: Rural Mode (SHIPPED)
- Toggle in bottom-right panel
- High-contrast rural base style
- Optional orthophoto overlay with opacity slider
- Optimized for outdoor facilities

### Phase 7: Empty States & Tour (SHIPPED)
- Empty state when no zones exist
- Contextual tooltips and guided tour
- Help panel with keyboard shortcuts

## Acceptance Criteria

✅ QuickStart wizard functional with 3 steps  
✅ Toolbar with tool selection, snap toggle, unit toggle  
✅ Bottom status shows live measurements  
✅ Left rail with 4 tabs (templates/shapes/layers/props)  
✅ Transform controls panel (width/length/rotation inputs)  
✅ Grid overlay visible when snap enabled  
✅ Command palette opens with Cmd+K  
✅ Rural mode toggle functional  
✅ Empty state displays when layout has no zones  
✅ No TypeScript errors  
✅ No console errors during normal operation  

## Technical Notes

- **State Management:** Zustand store (`editor.store.ts`)
- **UI Framework:** Tailwind CSS + Framer Motion
- **Command Palette:** `cmdk` library
- **Geospatial:** `@turf/turf` for snap/transform utilities
- **Map:** MapLibre GL + MapboxDraw

## Related Documents

- Acceptance Criteria: `docs/AC_EDITOR_UX.md`
- Implementation: See commit history on `feat/editor-ux-overhaul` branch

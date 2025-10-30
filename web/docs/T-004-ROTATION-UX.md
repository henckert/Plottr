# T-004: Rotation UX Improvements - Implementation Guide

## Overview
Enhanced rotation controls for the layout editor with keyboard shortcuts, visual handles, and a comprehensive rotation slider interface.

## Components Created/Modified

### 1. TransformControls.tsx (Enhanced)
**Location:** `web/src/components/editor/TransformControls.tsx`

**Features:**
- **Rotation Slider** (0-360°) with snap increment indicators
- **Quick Rotate Buttons** (±5° or custom snap) with keyboard hints
- **Numeric Input** with live rotation value
- **Snap Toggle** - Enable/disable rotation snapping
- **Visual Feedback** - Shows current rotation with snap indicator
- **Keyboard Shortcuts Display** - Q/E, Alt+Scroll, R+Drag hints

**Props:**
```typescript
interface TransformControlsProps {
  selectedFeature?: {
    id: string;
    rotation?: number;
    bounds?: { width: number; height: number };
  };
  onRotate?: (degrees: number) => void;
  onResize?: (width: number, height: number) => void;
}
```

**Integration:**
- Connects to `useEditorStore` for rotation snap settings
- Only visible when a feature is selected
- Syncs rotation value with selected feature
- Applies snap based on store settings (5°, 15°, 45°, etc.)

### 2. RotationHandle.tsx (New)
**Location:** `web/src/components/editor/RotationHandle.tsx`

**Features:**
- **Visual Handle** - Draggable circle at rotation radius
- **Center Indicator** - Dot showing rotation pivot point
- **Rotation Line** - Dashed line from center to handle
- **Live Angle Display** - Shows current rotation while dragging
- **Snap Feedback** - Visual indicator when snap is active
- **Circle Outline** - Shows rotation radius during drag
- **Keyboard Hint** - "Drag or press R" when idle

**Props:**
```typescript
interface RotationHandleProps {
  centerX: number;          // Screen coordinates
  centerY: number;
  rotation: number;         // Current angle in degrees
  radius?: number;          // Handle distance (default 80px)
  onRotate?: (degrees: number) => void;
  snapEnabled?: boolean;
  snapDegrees?: number;
  visible?: boolean;
}
```

**Usage Example:**
```tsx
<RotationHandle
  centerX={mapCenterX}
  centerY={mapCenterY}
  rotation={feature.rotation || 0}
  radius={100}
  onRotate={(angle) => updateFeatureRotation(feature.id, angle)}
  snapEnabled={rotationSnapEnabled}
  snapDegrees={rotationSnap}
  visible={!!selectedFeature}
/>
```

### 3. Editor Page (Modified)
**Location:** `web/src/app/layouts/[id]/editor/page.tsx`

**Added Keyboard Shortcuts:**
- **Q** - Rotate counter-clockwise by snap increment (default 5°)
- **E** - Rotate clockwise by snap increment (default 5°)
- **Escape** - Deselect feature (existing)
- **Delete/Backspace** - Delete feature (existing)

**Implementation:**
- Respects `rotationSnap` and `rotationSnapEnabled` from editor store
- Skips shortcuts when user is typing in input fields
- Normalizes rotation to 0-360° range
- Logs rotation changes (TODO: wire to mutation)

**Note:** Currently logs rotation changes as zones don't have `rotation_deg` field yet. Ready to wire up once backend schema is updated.

## Editor Store Integration

The rotation system uses these store fields:

```typescript
// web/src/store/editor.store.ts
{
  rotationSnap: number;           // Snap increment (5, 15, 45°)
  rotationSnapEnabled: boolean;   // Whether snap is active
  
  setRotationSnap: (degrees: number) => void;
  toggleRotationSnap: () => void;
}
```

**Preset Values:**
- GAA/Rugby/Soccer: 5° (align to pitch markings)
- Events (Stage, Parking): 15° (less precision needed)
- General: 5° default

## Interaction Patterns

### Keyboard Rotation (Q/E)
1. User selects a feature
2. Press **Q** to rotate CCW or **E** to rotate CW
3. Rotation increments by `rotationSnap` value (if enabled) or 5°
4. Rotation wraps around at 360° (0° = 360°)
5. Visual feedback in TransformControls panel

### Slider Rotation
1. User selects a feature
2. TransformControls panel appears
3. Drag slider 0-360° or click quick rotate buttons
4. Slider snaps to increment if snap enabled
5. Live preview of rotation value
6. Click "Apply Transform" to commit

### Visual Handle Rotation (R + Drag)
1. User selects a feature
2. RotationHandle appears at radius distance
3. Press and hold **R** key (future: activates rotation mode)
4. Drag handle around center point
5. Live angle indicator shows current rotation
6. Release mouse to commit rotation
7. Snap applied if enabled

### Mouse Wheel Rotation (Alt + Scroll)
**Status:** Planned (not yet implemented)

Future implementation:
1. Hold **Alt** key
2. Scroll mouse wheel over selected feature
3. Each scroll tick rotates by 1° (fine control)
4. Shift+Alt+Scroll for larger increments (15°)

## Snap Behavior

The rotation snap system provides two modes:

### Snap Enabled (default)
- All rotations round to nearest snap increment
- Slider moves in discrete steps
- Keyboard shortcuts use snap value
- Visual handle snaps during drag
- Snap indicator shown in UI

### Snap Disabled
- Free rotation (1° increments)
- Slider moves continuously
- Keyboard shortcuts use 5° default
- Visual handle rotates smoothly
- No snap indicator

**Toggle:** Click "Snap to X°" button in TransformControls

## Schema Updates Needed

Zones currently don't support rotation. To enable full functionality:

### Backend: zones.schema.ts
```typescript
export const ZoneResponseSchema = z.object({
  // ... existing fields
  rotation_deg: z.number().min(0).max(360).nullable().optional(),
});

export const ZoneUpdateSchema = z.object({
  // ... existing fields
  rotation_deg: z.number().min(0).max(360).optional(),
});
```

### Database Migration
```sql
ALTER TABLE zones 
ADD COLUMN rotation_deg NUMERIC(5,2) DEFAULT 0 CHECK (rotation_deg >= 0 AND rotation_deg < 360);
```

### Frontend: Update zone mutation
```typescript
// hooks/useZones.ts
const updateZoneMutation = useMutation({
  mutationFn: async ({ id, rotation_deg }: { id: number; rotation_deg: number }) => {
    return zoneApi.update(id, { rotation_deg }, versionToken);
  },
});
```

## Testing Checklist

- [ ] TransformControls appears when feature selected
- [ ] Rotation slider moves smoothly (or snaps if enabled)
- [ ] Quick rotate buttons work (±5° or snap increment)
- [ ] Numeric input accepts 0-360 values
- [ ] Snap toggle switches between modes
- [ ] Q key rotates CCW by snap increment
- [ ] E key rotates CW by snap increment
- [ ] Q/E respect snap enabled/disabled state
- [ ] Q/E skip when typing in input fields
- [ ] RotationHandle renders at correct position
- [ ] RotationHandle follows mouse during drag
- [ ] Rotation angle indicator shows live updates
- [ ] Rotation line updates during drag
- [ ] Snap feedback works in visual handle
- [ ] Reset button returns rotation to 0°
- [ ] Keyboard shortcuts hint displays correctly
- [ ] TransformControls hides when no selection

## Future Enhancements

1. **Alt+Scroll Fine Rotation** - Mouse wheel control
2. **R Key Activation** - Press R to enter rotation mode, then drag map
3. **Rotation Presets** - Quick buttons for 0°, 90°, 180°, 270°
4. **Compass Rose** - Visual compass showing orientation
5. **Multi-Select Rotation** - Rotate multiple features around group center
6. **Rotation History** - Undo/redo rotation changes
7. **Rotation Animation** - Smooth interpolation during rotation
8. **Touch Gestures** - Two-finger rotation on touch devices

## Accessibility

- Keyboard-only rotation control (Q/E keys)
- Visual feedback for all rotation states
- ARIA labels on rotation controls
- High contrast indicators
- Focus management in TransformControls

## Performance Considerations

- Rotation calculations cached during drag
- Debounced mutation calls (avoid spamming API)
- Lazy rendering of RotationHandle (only when selected)
- SVG optimizations for rotation line/circle
- RequestAnimationFrame for smooth drag updates

## Related Files

- `web/src/store/editor.store.ts` - Rotation state management
- `web/src/config/toolPresets.ts` - Default rotation snap per intent
- `web/src/types/template.types.ts` - ToolPreset interface
- `web/src/app/layouts/[id]/editor/page.tsx` - Main editor with keyboard shortcuts
- `web/src/components/editor/TransformControls.tsx` - Rotation UI panel
- `web/src/components/editor/RotationHandle.tsx` - Visual rotation handle

## Notes

- Rotation is currently a placeholder in zones - full backend support pending
- Visual handle coordinates need map-to-screen conversion (TODO: add in integration)
- Alt+Scroll rotation not yet implemented (planned for next iteration)
- R key activation mode not yet implemented (planned)

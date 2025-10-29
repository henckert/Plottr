// web/src/components/editor/GridOverlay.tsx
"use client";
import { useEditorStore } from "@/store/editor.store";

export function GridOverlay() {
  const { snapEnabled, gridSize } = useEditorStore();

  if (!snapEnabled) return null;

  // TODO: draw grid aligned to current map view using MapLibre custom layer or overlay div/canvas
  // For now, just show a visual indicator that snap is active

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
      {/* Grid visualization placeholder */}
      <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-400/30 rounded-lg px-3 py-1.5 text-xs text-white backdrop-blur">
        Grid: {gridSize}m
      </div>
    </div>
  );
}

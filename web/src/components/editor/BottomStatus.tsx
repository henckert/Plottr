// web/src/components/editor/BottomStatus.tsx
"use client";
import { useEditorStore } from "@/store/editor.store";

export function BottomStatus() {
  const { unitSystem } = useEditorStore();
  // TODO: wire live perimeter/area from draw tool

  return (
    <div className="h-14 bg-slate-900/95 border-t border-white/10 backdrop-blur-sm">
      <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-center">
        <div className="flex items-center gap-6 text-white/80 text-sm">
          <span>Perimeter: —</span>
          <span>Area: —</span>
          <span>Units: <span className="text-white font-medium">{unitSystem}</span></span>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-white/60 text-xs">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-xs">Enter</kbd> = finish •{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-xs">Esc</kbd> = cancel •{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-xs">Shift</kbd> = straight
          </span>
        </div>
      </div>
    </div>
  );
}

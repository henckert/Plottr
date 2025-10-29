// web/src/components/editor/BottomStatus.tsx
"use client";
import { useEditorStore } from "@/store/editor.store";

export function BottomStatus() {
  const { unitSystem } = useEditorStore();
  // TODO: wire live perimeter/area from draw tool

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
      <div className="rounded-xl bg-slate-900/80 border border-white/10 px-5 py-3 text-white/80 text-sm backdrop-blur shadow-xl">
        <div className="flex items-center gap-6">
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

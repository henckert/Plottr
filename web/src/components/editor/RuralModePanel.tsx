// web/src/components/editor/RuralModePanel.tsx
"use client";
import { useEditorStore } from "@/store/editor.store";
import { Mountain, Eye, X, GripVertical } from "lucide-react";

interface RuralModePanelProps {
  onClose: () => void;
}

export function RuralModePanel({ onClose }: RuralModePanelProps) {
  const { ruralMode, setRuralMode, ruralOpacity, setRuralOpacity } = useEditorStore();

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4 text-white backdrop-blur shadow-xl w-72">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <div className="drag-handle cursor-move text-white/40 hover:text-white/60 transition-colors -ml-1">
            <GripVertical className="w-4 h-4" />
          </div>
          <Mountain className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold">Rural Mode</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Close panel"
        >
          <X className="w-4 h-4 text-white/60 hover:text-white" />
        </button>
      </div>

      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={ruralMode}
          onChange={(e) => setRuralMode(e.target.checked)}
          className="w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-emerald-500 checked:border-emerald-500 cursor-pointer"
        />
        <span className="text-sm text-white/80">
          High-contrast rural base + orthophoto overlay
        </span>
      </label>

      {ruralMode && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/70">Orthophoto Opacity</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={ruralOpacity}
            onChange={(e) => setRuralOpacity(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="text-xs text-white/50 text-right">{ruralOpacity}%</div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/50">
        Optimized for outdoor facilities
      </div>
    </div>
  );
}

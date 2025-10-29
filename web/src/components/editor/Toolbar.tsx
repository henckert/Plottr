// web/src/components/editor/Toolbar.tsx
"use client";
import { useEditorStore } from "@/store/editor.store";
import { MousePointer2, Pencil, Ruler, Move, Grid3x3, CopyPlus } from "lucide-react";

export function Toolbar() {
  const { activeTool, setTool, toggleUnits, unitSystem, toggleSnap, snapEnabled } = useEditorStore();

  const ToolButton = ({ id, label, icon: Icon }: { id: any; label: string; icon: any }) => (
    <button
      onClick={() => setTool(id)}
      className={`px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2 ${
        activeTool === id
          ? "border-sky-400 bg-sky-500/10 text-white shadow-lg shadow-sky-500/20"
          : "border-white/10 hover:bg-white/5 text-white/80 hover:text-white"
      }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex gap-2 bg-slate-900/80 border border-white/10 rounded-2xl p-2 backdrop-blur shadow-xl">
      <ToolButton id="select" label="Select" icon={MousePointer2} />
      <ToolButton id="draw" label="Draw" icon={Pencil} />
      <ToolButton id="measure" label="Measure" icon={Ruler} />
      <ToolButton id="transform" label="Transform" icon={Move} />

      <div className="w-px bg-white/10 mx-1" />

      <button
        className={`px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2 ${
          snapEnabled
            ? "border-emerald-400 bg-emerald-500/10 text-white"
            : "border-white/10 hover:bg-white/5 text-white/80"
        }`}
        onClick={toggleSnap}
        title="Toggle snap to grid"
      >
        <Grid3x3 className="w-4 h-4" />
        <span className="text-sm">Snap {snapEnabled ? "ON" : "OFF"}</span>
      </button>

      <button
        className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-white/80 hover:text-white transition-all text-sm flex items-center gap-2"
        onClick={toggleUnits}
        title="Toggle units"
      >
        <CopyPlus className="w-4 h-4" />
        {unitSystem === "metric" ? "Metric" : "Imperial"}
      </button>
    </div>
  );
}

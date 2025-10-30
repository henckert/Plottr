// web/src/components/editor/Toolbar.tsx
"use client";
import { useEditorStore } from "@/store/editor.store";
import { MousePointer2, Pencil, Ruler, Move, Grid3x3, CopyPlus, GripVertical, Mountain, Save, Check } from "lucide-react";

interface ToolbarProps {
  onSave?: () => void;
  saveStatus?: 'saved' | 'saving' | 'unsaved' | 'error';
  hasUnsavedChanges?: boolean;
}

export function Toolbar({ onSave, saveStatus = 'saved', hasUnsavedChanges = false }: ToolbarProps) {
  const { activeTool, setTool, toggleUnits, unitSystem, toggleSnap, snapEnabled, showRuralPanel, setShowRuralPanel } = useEditorStore();

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

  // Save button config
  const saveButtonConfig = {
    saved: {
      icon: Check,
      label: "Saved",
      color: "border-emerald-400 bg-emerald-500/10 text-emerald-400",
      disabled: true,
    },
    saving: {
      icon: Save,
      label: "Saving...",
      color: "border-yellow-400 bg-yellow-500/10 text-yellow-400 animate-pulse",
      disabled: true,
    },
    unsaved: {
      icon: Save,
      label: "Save",
      color: "border-blue-400 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",
      disabled: false,
    },
    error: {
      icon: Save,
      label: "Retry",
      color: "border-red-400 bg-red-500/10 text-red-400 hover:bg-red-500/20",
      disabled: false,
    },
  };

  const saveConfig = hasUnsavedChanges ? saveButtonConfig.unsaved : saveButtonConfig[saveStatus];
  const SaveIcon = saveConfig.icon;

  return (
    <div className="flex gap-2 bg-slate-900/80 border border-white/10 rounded-2xl p-2 backdrop-blur shadow-xl">
      {/* Drag handle */}
      <div className="drag-handle cursor-move flex items-center px-1 text-white/40 hover:text-white/60 transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={saveConfig.disabled}
        className={`px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2 ${saveConfig.color} ${
          saveConfig.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
        title={hasUnsavedChanges ? 'Save changes (Ctrl+S)' : saveConfig.label}
      >
        <SaveIcon className="w-4 h-4" />
        <span className="text-sm font-medium">{saveConfig.label}</span>
      </button>

      <div className="w-px bg-white/10 mx-1" />

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

      <button
        className={`px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2 ${
          showRuralPanel
            ? "border-emerald-400 bg-emerald-500/10 text-white"
            : "border-white/10 hover:bg-white/5 text-white/80"
        }`}
        onClick={() => setShowRuralPanel(!showRuralPanel)}
        title="Toggle Rural Mode panel"
      >
        <Mountain className="w-4 h-4" />
      </button>
    </div>
  );
}

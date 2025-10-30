// web/src/store/editor.store.ts
import { create } from "zustand";
import type { ToolPreset } from "@/types/template.types";

export type UnitSystem = "metric" | "imperial";
export type Tool = "select" | "draw" | "measure" | "transform" | "none";

type EditorState = {
  activeTool: Tool;
  unitSystem: UnitSystem;
  snapEnabled: boolean;
  gridSize: 1 | 5 | 10;
  rotationSnap: number; // degrees (e.g., 5, 15, 45)
  rotationSnapEnabled: boolean;
  defaultZoneColor: string;
  defaultZoneSurface: string;
  suggestedLayers: string[];
  selection: string[]; // feature ids
  ruralMode: boolean;
  ruralOpacity: number; // 0-100
  showRuralPanel: boolean; // Control panel visibility
  lastSiteCenter?: { lng: number; lat: number; zoom?: number };
  openQuickStart: boolean;

  setTool: (t: Tool) => void;
  toggleUnits: () => void;
  toggleSnap: () => void;
  setGrid: (g: 1 | 5 | 10) => void;
  setRotationSnap: (degrees: number) => void;
  toggleRotationSnap: () => void;
  applyToolPreset: (preset: ToolPreset) => void;
  setSelection: (ids: string[]) => void;
  setRuralMode: (v: boolean) => void;
  setRuralOpacity: (v: number) => void;
  setShowRuralPanel: (v: boolean) => void;
  setLastSiteCenter: (c: { lng: number; lat: number; zoom?: number }) => void;
  setOpenQuickStart: (v: boolean) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: "select",
  unitSystem: "metric",
  snapEnabled: false,
  gridSize: 5,
  rotationSnap: 5,
  rotationSnapEnabled: true,
  defaultZoneColor: "#3b82f6",
  defaultZoneSurface: "grass",
  suggestedLayers: ["zones", "assets", "markings"],
  selection: [],
  ruralMode: false,
  ruralOpacity: 60,
  showRuralPanel: true,
  openQuickStart: true,

  setTool: (t) => set({ activeTool: t }),
  toggleUnits: () => set((s) => ({ unitSystem: s.unitSystem === "metric" ? "imperial" : "metric" })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setGrid: (g) => set({ gridSize: g }),
  setRotationSnap: (degrees) => set({ rotationSnap: degrees }),
  toggleRotationSnap: () => set((s) => ({ rotationSnapEnabled: !s.rotationSnapEnabled })),
  
  // Apply tool preset from Intent Wizard or template selection
  applyToolPreset: (preset: ToolPreset) => set({
    snapEnabled: true,
    gridSize: preset.snapGridSize as 1 | 5 | 10,
    rotationSnap: preset.rotationSnap,
    rotationSnapEnabled: preset.rotationSnapEnabled,
    unitSystem: preset.units,
    defaultZoneColor: preset.defaultZoneColor,
    defaultZoneSurface: preset.defaultZoneSurface,
    suggestedLayers: preset.suggestedLayers,
  }),
  
  setSelection: (ids) => set({ selection: ids }),
  setRuralMode: (v) => set({ ruralMode: v }),
  setRuralOpacity: (v) => set({ ruralOpacity: v }),
  setShowRuralPanel: (v) => set({ showRuralPanel: v }),
  setLastSiteCenter: (c) => set({ lastSiteCenter: c }),
  setOpenQuickStart: (v) => set({ openQuickStart: v }),
}));

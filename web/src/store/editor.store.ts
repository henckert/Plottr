// web/src/store/editor.store.ts
import { create } from "zustand";

export type UnitSystem = "metric" | "imperial";
export type Tool = "select" | "draw" | "measure" | "transform" | "none";

type EditorState = {
  activeTool: Tool;
  unitSystem: UnitSystem;
  snapEnabled: boolean;
  gridSize: 1 | 5 | 10;
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
  selection: [],
  ruralMode: false,
  ruralOpacity: 60,
  showRuralPanel: true,
  openQuickStart: true,

  setTool: (t) => set({ activeTool: t }),
  toggleUnits: () => set((s) => ({ unitSystem: s.unitSystem === "metric" ? "imperial" : "metric" })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setGrid: (g) => set({ gridSize: g }),
  setSelection: (ids) => set({ selection: ids }),
  setRuralMode: (v) => set({ ruralMode: v }),
  setRuralOpacity: (v) => set({ ruralOpacity: v }),
  setShowRuralPanel: (v) => set({ showRuralPanel: v }),
  setLastSiteCenter: (c) => set({ lastSiteCenter: c }),
  setOpenQuickStart: (v) => set({ openQuickStart: v }),
}));

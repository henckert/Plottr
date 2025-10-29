// web/src/components/editor/LeftRail.tsx
"use client";
import { useState } from "react";
import { Shapes, Layers, FileText, Settings2 } from "lucide-react";

export function LeftRail() {
  const [tab, setTab] = useState<"templates" | "shapes" | "layers" | "props">("templates");

  const tabs = [
    { id: "templates", label: "Templates", icon: FileText },
    { id: "shapes", label: "Shapes", icon: Shapes },
    { id: "layers", label: "Layers", icon: Layers },
    { id: "props", label: "Props", icon: Settings2 },
  ] as const;

  return (
    <div className="absolute top-20 left-4 z-30 w-72 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur shadow-xl overflow-hidden">
      {/* Tab Headers */}
      <div className="grid grid-cols-4 border-b border-white/10">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-3 py-3 text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                tab === t.id
                  ? "text-white bg-white/5 border-b-2 border-sky-400"
                  : "text-white/60 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-4 text-white/80 text-sm max-h-[600px] overflow-y-auto">
        {tab === "templates" && (
          <div>
            <h4 className="font-semibold mb-3 text-white">Pitch Templates</h4>
            <p className="text-white/60 text-xs mb-3">Select a preset pitch to insert</p>
            {/* TODO: populate with template cards */}
            <div className="space-y-2">
              {["GAA Full Pitch", "Rugby 15s", "Soccer 11-a-side", "Hockey Field"].map((name) => (
                <button
                  key={name}
                  className="w-full text-left px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <div className="font-medium text-white text-sm">{name}</div>
                  <div className="text-white/50 text-xs">Standard dimensions</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "shapes" && (
          <div>
            <h4 className="font-semibold mb-3 text-white">Quick Shapes</h4>
            <p className="text-white/60 text-xs mb-3">Insert basic geometry</p>
            <div className="space-y-2">
              {["Rectangle", "Circle", "Line"].map((name) => (
                <button
                  key={name}
                  className="w-full text-left px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-white text-sm"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "layers" && (
          <div>
            <h4 className="font-semibold mb-3 text-white">Layers</h4>
            <p className="text-white/60 text-xs mb-3">Manage zone visibility</p>
            {/* TODO: populate with layer list */}
            <div className="text-white/50 text-sm">No layers yet</div>
          </div>
        )}

        {tab === "props" && (
          <div>
            <h4 className="font-semibold mb-3 text-white">Properties</h4>
            <p className="text-white/60 text-xs mb-3">Edit selected zone</p>
            {/* TODO: populate with selected feature properties */}
            <div className="text-white/50 text-sm">No selection</div>
          </div>
        )}
      </div>
    </div>
  );
}

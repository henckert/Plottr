// web/src/components/editor/TransformControls.tsx
"use client";
import { useState } from "react";
import { RotateCw, Maximize2 } from "lucide-react";

export function TransformControls() {
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [rotation, setRotation] = useState("");

  // TODO: wire to selected feature bounds and apply transforms

  return (
    <div className="absolute top-20 right-4 z-30 w-72 rounded-2xl bg-slate-900/80 border border-white/10 p-4 text-white backdrop-blur shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Maximize2 className="w-5 h-5 text-sky-400" />
        <h3 className="font-semibold text-lg">Transform</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1.5 text-white/80">Width (m)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 p-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            placeholder="e.g. 68"
          />
        </div>

        <div>
          <label className="block text-sm mb-1.5 text-white/80">Length (m)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 p-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            placeholder="e.g. 105"
          />
        </div>

        <div>
          <label className="block text-sm mb-1.5 text-white/80 flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            Rotation (°)
          </label>
          <input
            type="number"
            value={rotation}
            onChange={(e) => setRotation(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 p-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            placeholder="0"
          />
        </div>

        <button className="w-full rounded-lg border border-white/10 bg-sky-600 hover:bg-sky-700 py-2.5 font-medium transition-colors">
          Apply Transform
        </button>

        <div className="pt-3 border-t border-white/10">
          <button className="w-full text-left text-sm text-white/60 hover:text-white/80 transition-colors">
            Reset to original
          </button>
        </div>
      </div>
    </div>
  );
}

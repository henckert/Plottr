// web/src/components/editor/TransformControls.tsx
"use client";
import { useState, useEffect } from "react";
import { RotateCw, Maximize2, RotateCcw } from "lucide-react";
import { useEditorStore } from "@/store/editor.store";
import { trackRotation } from "@/lib/analytics";

interface TransformControlsProps {
  selectedFeature?: {
    id: string;
    rotation?: number;
    bounds?: { width: number; height: number };
  };
  onRotate?: (degrees: number) => void;
  onResize?: (width: number, height: number) => void;
}

export function TransformControls({ selectedFeature, onRotate, onResize }: TransformControlsProps) {
  const { rotationSnap, rotationSnapEnabled, toggleRotationSnap } = useEditorStore();
  
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [rotation, setRotation] = useState("0");

  // Sync with selected feature
  useEffect(() => {
    if (selectedFeature) {
      setRotation(String(selectedFeature.rotation || 0));
      if (selectedFeature.bounds) {
        setWidth(String(selectedFeature.bounds.width || ""));
        setLength(String(selectedFeature.bounds.height || ""));
      }
    } else {
      setRotation("0");
      setWidth("");
      setLength("");
    }
  }, [selectedFeature]);

  const applyRotation = (degrees: number) => {
    let finalRotation = degrees;
    
    // Apply snap if enabled
    if (rotationSnapEnabled && rotationSnap > 0) {
      finalRotation = Math.round(degrees / rotationSnap) * rotationSnap;
    }
    
    // Normalize to 0-360
    finalRotation = ((finalRotation % 360) + 360) % 360;
    
    setRotation(String(finalRotation));
    if (onRotate) {
      onRotate(finalRotation);
    }
  };

  const handleRotationChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      applyRotation(num);
    } else {
      setRotation(value);
    }
  };

  const handleRotationSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    applyRotation(value);
    trackRotation('slider', value, rotationSnapEnabled);
  };

  const handleQuickRotate = (delta: number) => {
    const current = parseFloat(rotation) || 0;
    const step = rotationSnapEnabled ? rotationSnap : 5;
    const newRotation = current + (delta * step);
    applyRotation(newRotation);
    trackRotation('quick_button', newRotation, rotationSnapEnabled);
  };

  const handleApplyTransform = () => {
    const w = parseFloat(width);
    const l = parseFloat(length);
    const r = parseFloat(rotation);
    
    if (!isNaN(r) && onRotate) {
      onRotate(r);
    }
    
    if (!isNaN(w) && !isNaN(l) && onResize) {
      onResize(w, l);
    }
  };

  const handleReset = () => {
    setRotation("0");
    setWidth("");
    setLength("");
    if (onRotate) onRotate(0);
  };

  if (!selectedFeature) {
    return null;
  }

  return (
    <div className="absolute top-20 right-4 z-30 w-72 rounded-2xl bg-slate-900/80 border border-white/10 p-4 text-white backdrop-blur shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Maximize2 className="w-5 h-5 text-sky-400" />
        <h3 className="font-semibold text-lg">Transform</h3>
      </div>

      <div className="space-y-4">
        {/* Rotation Section */}
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <label className="block text-sm mb-2 text-white/80 flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            Rotation
          </label>
          
          {/* Quick rotate buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => handleQuickRotate(-1)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-sm font-medium"
              title={`Rotate ${rotationSnapEnabled ? `-${rotationSnap}` : '-5'}° (Q key)`}
            >
              ↶ {rotationSnapEnabled ? rotationSnap : 5}°
            </button>
            <button
              onClick={() => handleQuickRotate(1)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-sm font-medium"
              title={`Rotate ${rotationSnapEnabled ? `+${rotationSnap}` : '+5'}° (E key)`}
            >
              ↷ {rotationSnapEnabled ? rotationSnap : 5}°
            </button>
          </div>

          {/* Rotation slider */}
          <div className="mb-3">
            <input
              type="range"
              min="0"
              max="360"
              step={rotationSnapEnabled ? rotationSnap : 1}
              value={parseFloat(rotation) || 0}
              onChange={handleRotationSlider}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>0°</span>
              <span>180°</span>
              <span>360°</span>
            </div>
          </div>

          {/* Rotation input */}
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={rotation}
              onChange={(e) => handleRotationChange(e.target.value)}
              className="flex-1 rounded-lg bg-white/5 border border-white/10 p-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="0"
              min="0"
              max="360"
            />
            <span className="text-white/60">degrees</span>
          </div>

          {/* Snap toggle */}
          <button
            onClick={toggleRotationSnap}
            className={`w-full mt-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              rotationSnapEnabled
                ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                : 'bg-white/5 text-white/60 border border-white/10'
            }`}
          >
            {rotationSnapEnabled ? `✓ Snap to ${rotationSnap}°` : 'Snap disabled'}
          </button>
        </div>

        {/* Width/Length (optional) */}
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

        <button
          onClick={handleApplyTransform}
          className="w-full rounded-lg border border-white/10 bg-sky-600 hover:bg-sky-700 py-2.5 font-medium transition-colors"
        >
          Apply Transform
        </button>

        <div className="pt-3 border-t border-white/10">
          <button
            onClick={handleReset}
            className="w-full text-left text-sm text-white/60 hover:text-white/80 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to original
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-xs text-white/40 mb-1.5">Keyboard shortcuts:</p>
        <div className="space-y-1 text-xs text-white/60">
          <div className="flex justify-between">
            <span>Q / E</span>
            <span>Rotate ±{rotationSnapEnabled ? rotationSnap : 5}°</span>
          </div>
          <div className="flex justify-between">
            <span>Alt + Scroll</span>
            <span>Fine rotation</span>
          </div>
          <div className="flex justify-between">
            <span>R + Drag</span>
            <span>Visual rotation</span>
          </div>
        </div>
      </div>
    </div>
  );
}

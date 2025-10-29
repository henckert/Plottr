// web/src/components/editor/EmptyState.tsx
"use client";
import { FileText, Square, Pencil } from "lucide-react";

export function EmptyState({
  onTemplate,
  onRectangle,
  onTrace,
}: {
  onTemplate: () => void;
  onRectangle: () => void;
  onTrace: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-8 text-white text-center max-w-lg backdrop-blur shadow-2xl pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-400/30 flex items-center justify-center mx-auto mb-4">
          <Pencil className="w-8 h-8 text-sky-400" />
        </div>

        <h3 className="text-2xl font-semibold mb-2">Create your first zone</h3>
        <p className="text-white/70 mb-6">
          Place a preset pitch, draw a custom rectangle, or trace a boundary to get started.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onTemplate}
            className="px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors flex items-center gap-2 justify-center"
          >
            <FileText className="w-4 h-4" />
            Template
          </button>
          <button
            onClick={onRectangle}
            className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-white transition-colors flex items-center gap-2 justify-center"
          >
            <Square className="w-4 h-4" />
            Rectangle
          </button>
          <button
            onClick={onTrace}
            className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-white transition-colors flex items-center gap-2 justify-center"
          >
            <Pencil className="w-4 h-4" />
            Trace
          </button>
        </div>

        <div className="mt-6 text-xs text-white/50">
          Or press <kbd className="px-2 py-1 rounded bg-white/10 font-mono">Cmd+K</kbd> to open command palette
        </div>
      </div>
    </div>
  );
}

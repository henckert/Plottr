// web/src/components/editor/CommandPalette.tsx
"use client";
import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useEditorStore } from "@/store/editor.store";
import { Search } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setTool, toggleSnap, setOpenQuickStart } = useEditorStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-start justify-center pt-20 p-4">
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command Menu"
        className="w-full max-w-2xl rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-white/40" />
          <Command.Input
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>

        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-white/60 text-sm">
            No results found.
          </Command.Empty>

          <Command.Group heading="Tools" className="text-white/60 text-xs px-3 py-2">
            <Command.Item
              onSelect={() => {
                setTool("draw");
                setOpen(false);
              }}
              className="px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 hover:text-white transition-colors"
            >
              Start Drawing
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setTool("measure");
                setOpen(false);
              }}
              className="px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 hover:text-white transition-colors"
            >
              Measure Tool
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setTool("transform");
                setOpen(false);
              }}
              className="px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 hover:text-white transition-colors"
            >
              Transform Mode
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Actions" className="text-white/60 text-xs px-3 py-2 mt-2">
            <Command.Item
              onSelect={() => {
                toggleSnap();
                setOpen(false);
              }}
              className="px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 hover:text-white transition-colors"
            >
              Toggle Snap
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setOpenQuickStart(true);
                setOpen(false);
              }}
              className="px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 hover:text-white transition-colors"
            >
              Open Quick Start
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Templates" className="text-white/60 text-xs px-3 py-2 mt-2">
            <Command.Item className="px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 hover:text-white transition-colors">
              Insert GAA Full Pitch
            </Command.Item>
            <Command.Item className="px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 hover:text-white transition-colors">
              Insert Rugby 15s
            </Command.Item>
            <Command.Item className="px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 hover:text-white transition-colors">
              Insert Soccer 11-a-side
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="border-t border-white/10 px-4 py-2 text-xs text-white/40 flex items-center gap-4">
          <span>Navigate with ↑ ↓</span>
          <span>Select with Enter</span>
          <span>Close with Esc</span>
        </div>
      </Command.Dialog>
    </div>
  );
}

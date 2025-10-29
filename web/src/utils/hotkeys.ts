// web/src/utils/hotkeys.ts

/**
 * Register keyboard shortcuts for the editor
 * @param handlers Map of key combinations to handler functions
 * @returns Cleanup function to unregister listeners
 */
export function registerEditorHotkeys(handlers: Record<string, () => void>) {
  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    // Build key combination string
    let combo = "";
    if (ctrl) combo += "ctrl+";
    if (shift) combo += "shift+";
    if (alt) combo += "alt+";
    combo += key;

    // Execute handler if exists
    const handler = handlers[combo] || handlers[key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}

/**
 * Default editor hotkeys
 * TODO: Wire these to actual editor actions
 */
export const defaultEditorHotkeys = {
  // Tools
  v: () => console.log("Select tool"), // 'v' for select/move
  d: () => console.log("Draw tool"),
  m: () => console.log("Measure tool"),
  r: () => console.log("Rotate mode"),

  // Actions
  delete: () => console.log("Delete selected"),
  backspace: () => console.log("Delete selected"),
  "ctrl+z": () => console.log("Undo"),
  "ctrl+shift+z": () => console.log("Redo"),
  "ctrl+c": () => console.log("Copy"),
  "ctrl+v": () => console.log("Paste"),
  "ctrl+d": () => console.log("Duplicate"),

  // Rotation
  ",": () => console.log("Rotate -1°"),
  ".": () => console.log("Rotate +1°"),
  "shift+,": () => console.log("Rotate -15°"),
  "shift+.": () => console.log("Rotate +15°"),

  // Grid
  "ctrl+g": () => console.log("Toggle snap"),

  // View
  "ctrl+0": () => console.log("Fit to view"),
  "ctrl+=": () => console.log("Zoom in"),
  "ctrl+-": () => console.log("Zoom out"),
};

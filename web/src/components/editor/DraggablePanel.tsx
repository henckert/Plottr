// web/src/components/editor/DraggablePanel.tsx
"use client";
import { useState, useEffect, ReactNode } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";

interface DraggablePanelProps {
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  storageKey?: string; // Key to persist position in localStorage
  bounds?: string | { left?: number; top?: number; right?: number; bottom?: number };
}

export function DraggablePanel({
  children,
  defaultPosition = { x: 0, y: 0 },
  storageKey,
  bounds = "parent",
}: DraggablePanelProps) {
  const [position, setPosition] = useState(defaultPosition);

  // Load position from localStorage on mount
  useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPosition(parsed);
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    }
  }, [storageKey]);

  // Save position to localStorage when it changes
  const handleStop = (_e: DraggableEvent, data: DraggableData) => {
    const newPosition = { x: data.x, y: data.y };
    setPosition(newPosition);

    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(newPosition));
    }
  };

  return (
    <Draggable
      position={position}
      onStop={handleStop}
      bounds={bounds}
      handle=".drag-handle"
    >
      <div>
        {children}
      </div>
    </Draggable>
  );
}

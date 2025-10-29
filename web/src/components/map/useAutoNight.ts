"use client";
import { useEffect } from "react";

/**
 * Auto-switch to Night Survey style between 18:00-06:00 local time
 * Only switches once on mount to avoid interrupting manual style changes
 */
export function useAutoNight(setPreset: (v: any) => void) {
  useEffect(() => {
    try {
      const now = new Date();
      const hour = now.getHours();
      // Between 6 PM and 6 AM (18:00-06:00)
      if (hour >= 18 || hour < 6) {
        setPreset((currentPreset: any) => {
          // Only switch if not already on night mode
          return currentPreset === "night" ? currentPreset : "night";
        });
      }
    } catch (error) {
      console.warn("Auto-night mode check failed:", error);
    }
  }, [setPreset]);
}

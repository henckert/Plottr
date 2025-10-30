/**
 * UI Safe Zones Configuration
 * Defines protected areas where UI elements should not overlap map controls
 * Prevents important controls from being covered by floating panels
 */

export interface SafeZone {
  /** Safe zone identifier */
  id: string;
  /** Description of what this safe zone protects */
  description: string;
  /** CSS position */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  /** Padding from edges in pixels */
  padding: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Width of the safe zone */
  width?: number;
  /** Height of the safe zone */
  height?: number;
}

/**
 * Default safe zones for the editor layout
 * These zones protect map controls from being covered by UI panels
 */
export const EDITOR_SAFE_ZONES: SafeZone[] = [
  {
    id: 'map-navigation',
    description: 'MapLibre navigation controls (zoom, compass, pitch)',
    position: 'top-right',
    padding: { top: 16, right: 16 },
    width: 40,
    height: 120,
  },
  {
    id: 'map-scale',
    description: 'MapLibre scale control',
    position: 'bottom-left',
    padding: { bottom: 16, left: 16 },
    width: 200,
    height: 30,
  },
  {
    id: 'map-attribution',
    description: 'MapLibre attribution',
    position: 'bottom-right',
    padding: { bottom: 16, right: 16 },
    width: 100,
    height: 24,
  },
  {
    id: 'location-search',
    description: 'Geocoding search bar',
    position: 'top-left',
    padding: { top: 16, left: 16 },
    width: 320,
    height: 48,
  },
];

/**
 * Calculate safe positioning for a floating panel to avoid overlapping safe zones
 * @param panelPosition - Desired position of the panel
 * @param panelSize - Size of the panel {width, height}
 * @returns CSS positioning that respects safe zones
 */
export function calculateSafePosition(
  panelPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  panelSize: { width: number; height: number }
): { top?: number; right?: number; bottom?: number; left?: number } {
  const safeZonesInPosition = EDITOR_SAFE_ZONES.filter(
    (zone) => zone.position === panelPosition || isAdjacentPosition(zone.position, panelPosition)
  );

  const position: { top?: number; right?: number; bottom?: number; left?: number } = {};

  switch (panelPosition) {
    case 'top-left':
      position.top = 16;
      position.left = 16;
      // Check for conflicts with location search
      const searchZone = safeZonesInPosition.find((z) => z.id === 'location-search');
      if (searchZone) {
        position.top = (searchZone.padding.top || 0) + (searchZone.height || 0) + 16;
      }
      break;

    case 'top-right':
      position.top = 16;
      position.right = 16;
      // Check for conflicts with navigation controls
      const navZone = safeZonesInPosition.find((z) => z.id === 'map-navigation');
      if (navZone) {
        position.top = (navZone.padding.top || 0) + (navZone.height || 0) + 16;
      }
      break;

    case 'bottom-left':
      position.bottom = 16;
      position.left = 16;
      // Check for conflicts with scale control
      const scaleZone = safeZonesInPosition.find((z) => z.id === 'map-scale');
      if (scaleZone) {
        position.bottom = (scaleZone.padding.bottom || 0) + (scaleZone.height || 0) + 16;
      }
      break;

    case 'bottom-right':
      position.bottom = 16;
      position.right = 16;
      // Check for conflicts with attribution
      const attrZone = safeZonesInPosition.find((z) => z.id === 'map-attribution');
      if (attrZone) {
        position.bottom = (attrZone.padding.bottom || 0) + (attrZone.height || 0) + 16;
      }
      break;
  }

  return position;
}

/**
 * Check if two positions are adjacent (could cause overlap)
 */
function isAdjacentPosition(
  pos1: SafeZone['position'],
  pos2: SafeZone['position']
): boolean {
  const adjacencyMap: Record<string, string[]> = {
    'top-left': ['top-center', 'bottom-left'],
    'top-right': ['top-center', 'bottom-right'],
    'bottom-left': ['bottom-center', 'top-left'],
    'bottom-right': ['bottom-center', 'top-right'],
    'top-center': ['top-left', 'top-right'],
    'bottom-center': ['bottom-left', 'bottom-right'],
  };

  return adjacencyMap[pos1]?.includes(pos2) || false;
}

/**
 * Get recommended CSS for a panel that respects safe zones
 * @param position - Desired corner position
 * @param size - Panel dimensions
 * @returns CSS class names and inline styles
 */
export function getSafeZoneStyles(
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  size?: { width?: number; height?: number }
) {
  const safePos = calculateSafePosition(position, {
    width: size?.width || 300,
    height: size?.height || 400,
  });

  const styles: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    ...safePos,
  };

  return styles;
}

/**
 * Get map padding to account for UI panels
 * Use this with MapLibre's setPadding() to shift the map center
 * @param visiblePanels - List of currently visible panels
 * @returns Padding object for MapLibre
 */
export function getMapPadding(visiblePanels: {
  position: SafeZone['position'];
  width: number;
  height: number;
}[]): { top: number; right: number; bottom: number; left: number } {
  const padding = { top: 0, right: 0, bottom: 0, left: 0 };

  for (const panel of visiblePanels) {
    switch (panel.position) {
      case 'top-left':
        padding.top = Math.max(padding.top, panel.height + 32);
        padding.left = Math.max(padding.left, panel.width + 32);
        break;
      case 'top-right':
        padding.top = Math.max(padding.top, panel.height + 32);
        padding.right = Math.max(padding.right, panel.width + 32);
        break;
      case 'bottom-left':
        padding.bottom = Math.max(padding.bottom, panel.height + 32);
        padding.left = Math.max(padding.left, panel.width + 32);
        break;
      case 'bottom-right':
        padding.bottom = Math.max(padding.bottom, panel.height + 32);
        padding.right = Math.max(padding.right, panel.width + 32);
        break;
    }
  }

  return padding;
}

/**
 * Ensure a draggable panel stays within safe bounds
 * @param position - Current panel position {x, y}
 * @param panelSize - Panel dimensions
 * @param viewportSize - Viewport dimensions
 * @returns Constrained position
 */
export function constrainToSafeBounds(
  position: { x: number; y: number },
  panelSize: { width: number; height: number },
  viewportSize: { width: number; height: number }
): { x: number; y: number } {
  const MIN_MARGIN = 16;

  return {
    x: Math.max(
      MIN_MARGIN,
      Math.min(position.x, viewportSize.width - panelSize.width - MIN_MARGIN)
    ),
    y: Math.max(
      MIN_MARGIN,
      Math.min(position.y, viewportSize.height - panelSize.height - MIN_MARGIN)
    ),
  };
}

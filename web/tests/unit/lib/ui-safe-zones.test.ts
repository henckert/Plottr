/**
 * Unit tests for UI safe zones utility
 * Tests safe zone calculations and positioning
 */

import {
  EDITOR_SAFE_ZONES,
  calculateSafePosition,
  getSafeZoneStyles,
  getMapPadding,
  constrainToSafeBounds,
} from '@/lib/ui-safe-zones';

describe('EDITOR_SAFE_ZONES', () => {
  test('defines safe zones for all map controls', () => {
    expect(EDITOR_SAFE_ZONES).toHaveLength(4);
    
    const zoneIds = EDITOR_SAFE_ZONES.map(z => z.id);
    expect(zoneIds).toContain('map-navigation');
    expect(zoneIds).toContain('map-scale');
    expect(zoneIds).toContain('map-attribution');
    expect(zoneIds).toContain('location-search');
  });

  test('each safe zone has required properties', () => {
    EDITOR_SAFE_ZONES.forEach(zone => {
      expect(zone).toHaveProperty('id');
      expect(zone).toHaveProperty('description');
      expect(zone).toHaveProperty('position');
      expect(zone).toHaveProperty('padding');
    });
  });
});

describe('calculateSafePosition', () => {
  test('positions panel in top-left without conflicts', () => {
    const position = calculateSafePosition('top-left', { width: 300, height: 200 });
    
    expect(position).toHaveProperty('top');
    expect(position).toHaveProperty('left');
    expect(position.top).toBeGreaterThan(0);
    expect(position.left).toBeGreaterThan(0);
  });

  test('positions panel below search bar in top-left', () => {
    const position = calculateSafePosition('top-left', { width: 300, height: 200 });
    
    // Should be below the location search (48px height + 16px padding + 16px gap)
    expect(position.top).toBeGreaterThanOrEqual(64);
  });

  test('positions panel in top-right below navigation', () => {
    const position = calculateSafePosition('top-right', { width: 300, height: 200 });
    
    expect(position).toHaveProperty('top');
    expect(position).toHaveProperty('right');
    // Should be below navigation controls (120px + 16px + 16px)
    expect(position.top).toBeGreaterThanOrEqual(136);
  });

  test('positions panel in bottom-left above scale', () => {
    const position = calculateSafePosition('bottom-left', { width: 300, height: 200 });
    
    expect(position).toHaveProperty('bottom');
    expect(position).toHaveProperty('left');
    // Should be above scale control (30px + 16px + 16px)
    expect(position.bottom).toBeGreaterThanOrEqual(46);
  });

  test('positions panel in bottom-right above attribution', () => {
    const position = calculateSafePosition('bottom-right', { width: 300, height: 200 });
    
    expect(position).toHaveProperty('bottom');
    expect(position).toHaveProperty('right');
    // Should be above attribution (24px + 16px + 16px)
    expect(position.bottom).toBeGreaterThanOrEqual(40);
  });
});

describe('getSafeZoneStyles', () => {
  test('returns CSS styles object', () => {
    const styles = getSafeZoneStyles('top-left');
    
    expect(styles).toHaveProperty('position', 'absolute');
    expect(styles).toHaveProperty('zIndex', 10);
    expect(styles).toHaveProperty('top');
    expect(styles).toHaveProperty('left');
  });

  test('respects custom panel size', () => {
    const styles = getSafeZoneStyles('top-right', { width: 400, height: 500 });
    
    expect(styles.top).toBeDefined();
    expect(styles.right).toBeDefined();
  });
});

describe('getMapPadding', () => {
  test('returns zero padding for no panels', () => {
    const padding = getMapPadding([]);
    
    expect(padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  test('calculates padding for top-left panel', () => {
    const padding = getMapPadding([
      { position: 'top-left', width: 300, height: 400 },
    ]);
    
    expect(padding.top).toBeGreaterThan(0);
    expect(padding.left).toBeGreaterThan(0);
    expect(padding.right).toBe(0);
    expect(padding.bottom).toBe(0);
  });

  test('calculates padding for multiple panels', () => {
    const padding = getMapPadding([
      { position: 'top-left', width: 300, height: 400 },
      { position: 'bottom-right', width: 320, height: 200 },
    ]);
    
    expect(padding.top).toBeGreaterThan(0);
    expect(padding.left).toBeGreaterThan(0);
    expect(padding.right).toBeGreaterThan(0);
    expect(padding.bottom).toBeGreaterThan(0);
  });

  test('uses maximum padding for overlapping positions', () => {
    const padding = getMapPadding([
      { position: 'top-left', width: 200, height: 300 },
      { position: 'top-left', width: 300, height: 400 },
    ]);
    
    // Should use the larger panel dimensions
    expect(padding.top).toBeGreaterThanOrEqual(432); // 400 + 32
    expect(padding.left).toBeGreaterThanOrEqual(332); // 300 + 32
  });
});

describe('constrainToSafeBounds', () => {
  const viewportSize = { width: 1920, height: 1080 };
  const panelSize = { width: 300, height: 400 };

  test('keeps position within bounds', () => {
    const position = { x: 100, y: 100 };
    const constrained = constrainToSafeBounds(position, panelSize, viewportSize);
    
    expect(constrained.x).toBe(100);
    expect(constrained.y).toBe(100);
  });

  test('constrains negative x to minimum margin', () => {
    const position = { x: -50, y: 100 };
    const constrained = constrainToSafeBounds(position, panelSize, viewportSize);
    
    expect(constrained.x).toBe(16); // MIN_MARGIN
    expect(constrained.y).toBe(100);
  });

  test('constrains negative y to minimum margin', () => {
    const position = { x: 100, y: -50 };
    const constrained = constrainToSafeBounds(position, panelSize, viewportSize);
    
    expect(constrained.x).toBe(100);
    expect(constrained.y).toBe(16); // MIN_MARGIN
  });

  test('constrains x beyond viewport width', () => {
    const position = { x: 2000, y: 100 };
    const constrained = constrainToSafeBounds(position, panelSize, viewportSize);
    
    expect(constrained.x).toBeLessThanOrEqual(viewportSize.width - panelSize.width - 16);
    expect(constrained.y).toBe(100);
  });

  test('constrains y beyond viewport height', () => {
    const position = { x: 100, y: 2000 };
    const constrained = constrainToSafeBounds(position, panelSize, viewportSize);
    
    expect(constrained.x).toBe(100);
    expect(constrained.y).toBeLessThanOrEqual(viewportSize.height - panelSize.height - 16);
  });

  test('handles small viewports', () => {
    const smallViewport = { width: 800, height: 600 };
    const position = { x: 1000, y: 1000 };
    const constrained = constrainToSafeBounds(position, panelSize, smallViewport);
    
    expect(constrained.x).toBeLessThanOrEqual(smallViewport.width - panelSize.width - 16);
    expect(constrained.y).toBeLessThanOrEqual(smallViewport.height - panelSize.height - 16);
  });
});

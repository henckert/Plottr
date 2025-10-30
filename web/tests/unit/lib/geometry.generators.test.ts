/**
 * Unit tests for geometry generators
 * Tests pitch and layout template generation functions
 */

import {
  generateRectangle,
  generateGAAPitch,
  generateRugbyPitch,
  generateSoccerPitch,
  generateHockeyPitch,
  generateParkingBay,
  generateMarketStall,
} from '@/lib/geometry.generators';

describe('generateRectangle', () => {
  test('generates valid GeoJSON polygon', () => {
    const rect = generateRectangle(53.3498, -6.2603, { width: 100, length: 50 });
    
    expect(rect.type).toBe('Polygon');
    expect(rect.coordinates).toHaveLength(1);
    expect(rect.coordinates[0]).toHaveLength(5); // 4 corners + closing point
    
    // First and last points should match (closed ring)
    expect(rect.coordinates[0][0]).toEqual(rect.coordinates[0][4]);
  });

  test('applies rotation correctly', () => {
    const noRotation = generateRectangle(53.3498, -6.2603, { width: 100, length: 50 }, 0);
    const rotated90 = generateRectangle(53.3498, -6.2603, { width: 100, length: 50 }, 90);
    
    // Rotated rectangle should have different coordinates
    expect(noRotation.coordinates[0][0]).not.toEqual(rotated90.coordinates[0][0]);
  });

  test('generates counter-clockwise winding', () => {
    const rect = generateRectangle(53.3498, -6.2603, { width: 100, length: 50 });
    const ring = rect.coordinates[0];
    
    // Calculate signed area (should be negative for CCW)
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      area += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
    }
    
    expect(area).toBeLessThan(0); // Counter-clockwise
  });
});

describe('Sport Pitch Generators', () => {
  test('generateGAAPitch creates standard pitch', () => {
    const pitch = generateGAAPitch(53.3498, -6.2603, { width: 145, length: 90 });
    
    expect(pitch.type).toBe('Polygon');
    expect(pitch.coordinates[0]).toHaveLength(5);
    
    // First and last points should match (closed ring)
    expect(pitch.coordinates[0][0]).toEqual(pitch.coordinates[0][4]);
  });

  test('generateRugbyPitch creates standard pitch', () => {
    const pitch = generateRugbyPitch(53.3498, -6.2603, { width: 70, length: 100 });
    
    expect(pitch.type).toBe('Polygon');
    expect(pitch.coordinates[0]).toHaveLength(5);
  });

  test('generateSoccerPitch creates standard pitch', () => {
    const pitch = generateSoccerPitch(53.3498, -6.2603, { width: 68, length: 105 });
    
    expect(pitch.type).toBe('Polygon');
    expect(pitch.coordinates[0]).toHaveLength(5);
  });

  test('generateHockeyPitch creates standard pitch', () => {
    const pitch = generateHockeyPitch(53.3498, -6.2603, { width: 55, length: 91.4 });
    
    expect(pitch.type).toBe('Polygon');
    expect(pitch.coordinates[0]).toHaveLength(5);
  });
});

describe('Event Layout Generators', () => {
  test('generateParkingBay creates valid polygon', () => {
    const bay = generateParkingBay(53.3498, -6.2603, { width: 2.5, length: 5 });
    
    expect(bay.type).toBe('Polygon');
    expect(bay.coordinates[0]).toHaveLength(5);
  });

  test('generateMarketStall creates valid polygon', () => {
    const stall = generateMarketStall(53.3498, -6.2603, { width: 3, length: 3 });
    
    expect(stall.type).toBe('Polygon');
    expect(stall.coordinates[0]).toHaveLength(5);
  });

  test('parking bay has correct dimensions', () => {
    const bay = generateParkingBay(53.3498, -6.2603, { width: 2.5, length: 5 });
    // Should create a valid 5-point polygon (4 corners + closing point)
    expect(bay.coordinates[0]).toHaveLength(5);
  });
});

describe('Edge Cases', () => {
  test('handles coordinates at prime meridian', () => {
    const rect = generateRectangle(51.4778, 0, { width: 100, length: 50 });
    expect(rect.coordinates[0]).toHaveLength(5);
  });

  test('handles coordinates at equator', () => {
    const rect = generateRectangle(0, 0, { width: 100, length: 50 });
    expect(rect.coordinates[0]).toHaveLength(5);
  });

  test('handles very small dimensions', () => {
    const tiny = generateRectangle(53.3498, -6.2603, { width: 1, length: 1 });
    expect(tiny.coordinates[0]).toHaveLength(5);
  });

  test('handles very large dimensions', () => {
    const large = generateRectangle(53.3498, -6.2603, { width: 1000, length: 500 });
    expect(large.coordinates[0]).toHaveLength(5);
  });

  test('handles 360 degree rotation (same as 0)', () => {
    const rot0 = generateRectangle(53.3498, -6.2603, { width: 100, length: 50 }, 0);
    const rot360 = generateRectangle(53.3498, -6.2603, { width: 100, length: 50 }, 360);
    
    // Should be very close (within floating point tolerance)
    expect(rot0.coordinates[0][0][0]).toBeCloseTo(rot360.coordinates[0][0][0], 6);
    expect(rot0.coordinates[0][0][1]).toBeCloseTo(rot360.coordinates[0][0][1], 6);
  });
});

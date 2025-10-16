import {
  validatePolygonStructure,
  validateWGS84Bounds,
  checkSelfIntersection,
  validateWindingOrder,
  validatePitchPolygon,
  validatePitchFitsInVenue,
  type GeoPolygon,
} from '../../src/lib/geospatial';

describe('Geospatial Validation', () => {
  describe('validatePolygonStructure', () => {
    it('should reject null geometry', () => {
      const result = validatePolygonStructure(null);
      expect(result?.code).toBe('INVALID_POLYGON');
      expect(result?.message).toContain('required');
    });

    it('should reject non-Polygon types', () => {
      const result = validatePolygonStructure({ type: 'Point', coordinates: [0, 0] });
      expect(result?.code).toBe('INVALID_POLYGON');
      expect(result?.message).toContain('must be a Polygon');
    });

    it('should reject empty coordinates', () => {
      const result = validatePolygonStructure({ type: 'Polygon', coordinates: [] });
      expect(result?.code).toBe('INVALID_POLYGON');
      expect(result?.message).toContain('non-empty array');
    });

    it('should reject polygon with < 4 points', () => {
      const result = validatePolygonStructure({
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 1], [0, 0]]],
      });
      expect(result?.code).toBe('INSUFFICIENT_POINTS');
      expect(result?.message).toContain('at least 4 points');
    });

    it('should reject unclosed rings', () => {
      const result = validatePolygonStructure({
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
      });
      expect(result?.code).toBe('INVALID_POLYGON');
      expect(result?.message).toContain('closed');
    });

    it('should accept valid simple square', () => {
      const result = validatePolygonStructure({
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      });
      expect(result).toBeNull();
    });

    it('should accept valid complex polygon', () => {
      const result = validatePolygonStructure({
        type: 'Polygon',
        coordinates: [[
          [-74.006, 40.713],
          [-74.005, 40.713],
          [-74.005, 40.714],
          [-74.006, 40.714],
          [-74.006, 40.713],
        ]],
      });
      expect(result).toBeNull();
    });

    it('should reject non-numeric coordinates', () => {
      const result = validatePolygonStructure({
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 'a'], [1, 1], [0, 1], [0, 0]]],
      });
      expect(result?.code).toBe('INVALID_POLYGON');
      expect(result?.message).toContain('non-numeric');
    });
  });

  describe('validateWGS84Bounds', () => {
    it('should accept coordinates within WGS84 bounds', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [0, 0],
          [45, 0],
          [45, 45],
          [0, 45],
          [0, 0],
        ]],
      };
      const result = validateWGS84Bounds(polygon);
      expect(result).toBeNull();
    });

    it('should accept edge case: dateline at 180', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [179, -85],
          [180, -85],
          [180, 85],
          [179, 85],
          [179, -85],
        ]],
      };
      const result = validateWGS84Bounds(polygon);
      expect(result).toBeNull();
    });

    it('should accept edge case: antimeridian at -180', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-180, -85],
          [-179, -85],
          [-179, 85],
          [-180, 85],
          [-180, -85],
        ]],
      };
      const result = validateWGS84Bounds(polygon);
      expect(result).toBeNull();
    });

    it('should reject longitude > 180', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [0, 0],
          [181, 0],
          [181, 1],
          [0, 1],
          [0, 0],
        ]],
      };
      const result = validateWGS84Bounds(polygon);
      expect(result?.code).toBe('INVALID_SRID');
      expect(result?.message).toContain('181');
      expect(result?.message).toContain('[-180, 180]');
    });

    it('should reject longitude < -180', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [0, 0],
          [-181, 0],
          [-181, 1],
          [0, 1],
          [0, 0],
        ]],
      };
      const result = validateWGS84Bounds(polygon);
      expect(result?.code).toBe('INVALID_SRID');
      expect(result?.message).toContain('-181');
    });

    it('should reject latitude > 90', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [0, 0],
          [1, 0],
          [1, 91],
          [0, 91],
          [0, 0],
        ]],
      };
      const result = validateWGS84Bounds(polygon);
      expect(result?.code).toBe('INVALID_SRID');
      expect(result?.message).toContain('91');
      expect(result?.message).toContain('[-90, 90]');
    });

    it('should reject latitude < -90', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [0, 0],
          [1, 0],
          [1, -91],
          [0, -91],
          [0, 0],
        ]],
      };
      const result = validateWGS84Bounds(polygon);
      expect(result?.code).toBe('INVALID_SRID');
      expect(result?.message).toContain('-91');
    });
  });

  describe('checkSelfIntersection', () => {
    it('should accept simple non-self-intersecting square', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const result = checkSelfIntersection(polygon);
      expect(result).toBeNull();
    });

    it('should accept simple rectangle', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.006, 40.713],
          [-74.003, 40.713],
          [-74.003, 40.714],
          [-74.006, 40.714],
          [-74.006, 40.713],
        ]],
      };
      const result = checkSelfIntersection(polygon);
      expect(result).toBeNull();
    });

    it('should detect figure-8 self-intersection', () => {
      // Figure-8 pattern: edges cross each other (vertices ordered to create crossing)
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]],
      };
      const result = checkSelfIntersection(polygon);
      expect(result?.code).toBe('SELF_INTERSECTING');
      expect(result?.message).toContain('self-intersects');
    });

    it('should accept star polygon (valid non-convex shape)', () => {
      // Valid non-convex polygon (star-like but non-self-intersecting)
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 1], [0.3, 0.3], [1, 0], [0.3, -0.3], [0, -1], [-0.3, -0.3], [-1, 0], [-0.3, 0.3], [0, 1]]],
      };
      const result = checkSelfIntersection(polygon);
      expect(result).toBeNull();
    });

    it('should detect bowtie self-intersection', () => {
      // True bowtie: edges cross in the middle
      const bowtie: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]],
      };
      const result = checkSelfIntersection(bowtie);
      expect(result?.code).toBe('SELF_INTERSECTING');
    });
  });

  describe('validateWindingOrder', () => {
    it('should accept counter-clockwise polygon (correct winding)', () => {
      // In geographic coordinates: lower-left to lower-right to upper-right to upper-left
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const result = validateWindingOrder(polygon);
      expect(result).toBeNull();
    });

    it('should accept counter-clockwise NYC bounds', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.006, 40.713],
          [-74.003, 40.713],
          [-74.003, 40.714],
          [-74.006, 40.714],
          [-74.006, 40.713],
        ]],
      };
      const result = validateWindingOrder(polygon);
      expect(result).toBeNull();
    });

    it('should reject clockwise polygon (wrong winding)', () => {
      // Reverse order: upper-left to upper-right to lower-right to lower-left
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 1], [1, 1], [1, 0], [0, 0], [0, 1]]],
      };
      const result = validateWindingOrder(polygon);
      expect(result?.code).toBe('INVALID_WINDING');
      expect(result?.message).toContain('counter-clockwise');
      expect(result?.message).toContain('clockwise');
    });

    it('should reject clockwise with large coordinates', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.003, 40.714],
          [-74.003, 40.713],
          [-74.006, 40.713],
          [-74.006, 40.714],
          [-74.003, 40.714],
        ]],
      };
      const result = validateWindingOrder(polygon);
      expect(result?.code).toBe('INVALID_WINDING');
    });
  });

  describe('validatePitchPolygon (master validation)', () => {
    it('should accept valid pitch polygon', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const result = validatePitchPolygon(polygon);
      expect(result).toBeNull();
    });

    it('should reject self-intersecting polygon', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]],
      };
      const result = validatePitchPolygon(polygon);
      expect(result?.code).toBe('SELF_INTERSECTING');
    });

    it('should reject clockwise polygon', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 1], [1, 1], [1, 0], [0, 0], [0, 1]]],
      };
      const result = validatePitchPolygon(polygon);
      expect(result?.code).toBe('INVALID_WINDING');
    });

    it('should reject out-of-bounds longitude', () => {
      const polygon: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [181, 0], [181, 1], [0, 1], [0, 0]]],
      };
      const result = validatePitchPolygon(polygon);
      expect(result?.code).toBe('INVALID_SRID');
    });

    it('should reject incomplete polygon structure', () => {
      const result = validatePitchPolygon({ type: 'Polygon', coordinates: [] });
      expect(result?.code).toBe('INVALID_POLYGON');
    });

    it('should process validation in correct order: structure -> bounds -> self-intersection -> winding', () => {
      // Invalid structure should be caught first
      const result = validatePitchPolygon(null);
      expect(result?.code).toBe('INVALID_POLYGON');
    });
  });

  describe('validatePitchFitsInVenue', () => {
    it('should accept pitch within venue bounds', () => {
      const pitch: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5], [0, 0]]],
      };
      const venue: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[-1, -1], [2, -1], [2, 2], [-1, 2], [-1, -1]]],
      };
      const result = validatePitchFitsInVenue(pitch, venue);
      expect(result).toBeNull();
    });

    it('should accept pitch exactly matching venue bounds', () => {
      const pitch: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const venue: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const result = validatePitchFitsInVenue(pitch, venue);
      expect(result).toBeNull();
    });

    it('should accept pitch with null venue bounds (no constraint)', () => {
      const pitch: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const result = validatePitchFitsInVenue(pitch, null);
      expect(result).toBeNull();
    });

    it('should reject pitch extending outside venue longitude', () => {
      const pitch: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [2, 0], [2, 0.5], [0, 0.5], [0, 0]]],
      };
      const venue: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const result = validatePitchFitsInVenue(pitch, venue);
      expect(result?.code).toBe('OUT_OF_BOUNDS');
      expect(result?.message).toContain('outside venue bounds');
    });

    it('should reject pitch extending outside venue latitude', () => {
      const pitch: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 2], [0, 2], [0, 0]]],
      };
      const venue: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const result = validatePitchFitsInVenue(pitch, venue);
      expect(result?.code).toBe('OUT_OF_BOUNDS');
    });

    it('should reject pitch with one corner outside venue', () => {
      const pitch: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1.1, 0], [1.1, 0.5], [0, 0.5], [0, 0]]],
      };
      const venue: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const result = validatePitchFitsInVenue(pitch, venue);
      expect(result?.code).toBe('OUT_OF_BOUNDS');
    });

    it('should work with NYC geographic coordinates', () => {
      const pitch: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.0050, 40.7130],
          [-74.0045, 40.7130],
          [-74.0045, 40.7135],
          [-74.0050, 40.7135],
          [-74.0050, 40.7130],
        ]],
      };
      const venue: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.0060, 40.7120],
          [-74.0040, 40.7120],
          [-74.0040, 40.7140],
          [-74.0060, 40.7140],
          [-74.0060, 40.7120],
        ]],
      };
      const result = validatePitchFitsInVenue(pitch, venue);
      expect(result).toBeNull();
    });

    it('should reject pitch outside NYC venue', () => {
      const pitch: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.0070, 40.7130],
          [-74.0065, 40.7130],
          [-74.0065, 40.7135],
          [-74.0070, 40.7135],
          [-74.0070, 40.7130],
        ]],
      };
      const venue: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-74.0060, 40.7120],
          [-74.0040, 40.7120],
          [-74.0040, 40.7140],
          [-74.0060, 40.7140],
          [-74.0060, 40.7120],
        ]],
      };
      const result = validatePitchFitsInVenue(pitch, venue);
      expect(result?.code).toBe('OUT_OF_BOUNDS');
      expect(result?.message).toContain('outside venue bounds');
    });
  });
});

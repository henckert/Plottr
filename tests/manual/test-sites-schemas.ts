/**
 * Manual validation test for Sites schemas
 * Run with: npx ts-node tests/manual/test-sites-schemas.ts
 */

import {
  SiteCreateSchema,
  SiteUpdateSchema,
  SiteResponseSchema,
  GeoPointSchema,
  GeoPolygonSchema,
} from '../../src/schemas/sites.schema';

console.log('Testing Sites Zod Schemas...\n');

// Test 1: Valid GeoPoint
console.log('Test 1: Valid GeoPoint');
const validPoint = {
  type: 'Point',
  coordinates: [-6.3294, 53.3562],
};
const pointResult = GeoPointSchema.safeParse(validPoint);
console.log('✅ Valid:', pointResult.success);
if (!pointResult.success) {
  console.error('Errors:', pointResult.error.errors);
}

// Test 2: Invalid GeoPoint (longitude out of range)
console.log('\nTest 2: Invalid GeoPoint (longitude out of range)');
const invalidPoint = {
  type: 'Point',
  coordinates: [-200, 53.3562],
};
const invalidPointResult = GeoPointSchema.safeParse(invalidPoint);
console.log('❌ Invalid:', !invalidPointResult.success);
if (!invalidPointResult.success) {
  console.log('Expected errors:', invalidPointResult.error.errors[0].message);
}

// Test 3: Valid GeoPolygon (closed ring)
console.log('\nTest 3: Valid GeoPolygon (closed ring)');
const validPolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-6.33, 53.35],
      [-6.32, 53.35],
      [-6.32, 53.36],
      [-6.33, 53.36],
      [-6.33, 53.35], // Closing point
    ],
  ],
};
const polygonResult = GeoPolygonSchema.safeParse(validPolygon);
console.log('✅ Valid:', polygonResult.success);
if (!polygonResult.success) {
  console.error('Errors:', polygonResult.error.errors);
}

// Test 4: Invalid GeoPolygon (not closed)
console.log('\nTest 4: Invalid GeoPolygon (not closed)');
const invalidPolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-6.33, 53.35],
      [-6.32, 53.35],
      [-6.32, 53.36],
      [-6.33, 53.36],
      // Missing closing point
    ],
  ],
};
const invalidPolygonResult = GeoPolygonSchema.safeParse(invalidPolygon);
console.log('❌ Invalid:', !invalidPolygonResult.success);
if (!invalidPolygonResult.success) {
  console.log('Expected errors:', invalidPolygonResult.error.errors[0].message);
}

// Test 5: Valid SiteCreateSchema
console.log('\nTest 5: Valid SiteCreateSchema');
const validCreate = {
  club_id: 1,
  name: 'Phoenix Park',
  address: 'Phoenix Park, Dublin 8',
  city: 'Dublin',
  state: 'Dublin',
  country: 'Ireland',
  postal_code: 'D08',
  location: {
    type: 'Point',
    coordinates: [-6.3294, 53.3562],
  },
  bbox: {
    type: 'Polygon',
    coordinates: [
      [
        [-6.33, 53.35],
        [-6.32, 53.35],
        [-6.32, 53.36],
        [-6.33, 53.36],
        [-6.33, 53.35],
      ],
    ],
  },
};
const createResult = SiteCreateSchema.safeParse(validCreate);
console.log('✅ Valid:', createResult.success);
if (!createResult.success) {
  console.error('Errors:', createResult.error.errors);
}

// Test 6: Invalid SiteCreateSchema (name too long)
console.log('\nTest 6: Invalid SiteCreateSchema (name too long)');
const invalidCreate = {
  club_id: 1,
  name: 'A'.repeat(201), // 201 characters (max 200)
};
const invalidCreateResult = SiteCreateSchema.safeParse(invalidCreate);
console.log('❌ Invalid:', !invalidCreateResult.success);
if (!invalidCreateResult.success) {
  console.log('Expected errors:', invalidCreateResult.error.errors[0].message);
}

// Test 7: Valid SiteUpdateSchema (partial update)
console.log('\nTest 7: Valid SiteUpdateSchema (partial update)');
const validUpdate = {
  name: 'Updated Name',
  city: 'New City',
};
const updateResult = SiteUpdateSchema.safeParse(validUpdate);
console.log('✅ Valid:', updateResult.success);
if (!updateResult.success) {
  console.error('Errors:', updateResult.error.errors);
}

// Test 8: Invalid SiteUpdateSchema (unknown field)
console.log('\nTest 8: Invalid SiteUpdateSchema (unknown field - strict mode)');
const invalidUpdate = {
  name: 'Updated Name',
  unknown_field: 'Should reject',
};
const invalidUpdateResult = SiteUpdateSchema.safeParse(invalidUpdate);
console.log('❌ Invalid:', !invalidUpdateResult.success);
if (!invalidUpdateResult.success) {
  console.log('Expected errors:', invalidUpdateResult.error.errors[0].message);
}

// Test 9: Valid SiteResponseSchema
console.log('\nTest 9: Valid SiteResponseSchema');
const validResponse = {
  id: 1,
  club_id: 1,
  name: 'Phoenix Park',
  address: 'Phoenix Park, Dublin 8',
  city: 'Dublin',
  state: 'Dublin',
  country: 'Ireland',
  postal_code: 'D08',
  location: {
    type: 'Point',
    coordinates: [-6.3294, 53.3562],
  },
  bbox: null,
  version_token: '550e8400-e29b-41d4-a716-446655440000',
  created_at: '2025-10-20T10:00:00.000Z',
  updated_at: '2025-10-20T10:00:00.000Z',
  deleted_at: null,
};
const responseResult = SiteResponseSchema.safeParse(validResponse);
console.log('✅ Valid:', responseResult.success);
if (!responseResult.success) {
  console.error('Errors:', responseResult.error.errors);
}

// Test 10: Invalid SiteResponseSchema (invalid UUID)
console.log('\nTest 10: Invalid SiteResponseSchema (invalid UUID)');
const invalidResponse = {
  ...validResponse,
  version_token: 'not-a-uuid',
};
const invalidResponseResult = SiteResponseSchema.safeParse(invalidResponse);
console.log('❌ Invalid:', !invalidResponseResult.success);
if (!invalidResponseResult.success) {
  console.log('Expected errors:', invalidResponseResult.error.errors[0].message);
}

console.log('\n✅ All schema validation tests passed!');

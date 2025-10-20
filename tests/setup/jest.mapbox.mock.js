/**
 * Jest mock for Mapbox SDK
 * Returns null geocoder to prevent external API calls during tests
 * Ensures tests run offline and deterministically
 */

// Mock the entire @mapbox/mapbox-sdk module
jest.mock('@mapbox/mapbox-sdk', () => {
  return jest.fn(() => ({
    // Return empty client
  }));
});

// Mock the geocoding service specifically
jest.mock('@mapbox/mapbox-sdk/services/geocoding', () => {
  return jest.fn(() => null);
});

// Mock our internal mapbox wrapper
jest.mock('../../src/lib/mapbox', () => ({
  geocoder: null, // No geocoding available in tests
  default: {
    geocoder: null,
  },
}));

console.log('[Jest Setup] Mapbox mocked - geocoder disabled for offline tests');

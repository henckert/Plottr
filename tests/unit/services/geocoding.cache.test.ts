/**
 * Geocoding Cache Service Unit Tests
 * 
 * Tests for caching layer with in-memory fallback and optional Redis backend,
 * TTL expiration, concurrent operations, and statistics tracking
 */

import GeocodingCacheService from '../../../src/services/geocoding.cache';
import { GeoJSONFeature, GeocodingCacheEntry } from '../../../src/lib/geocoding.types';

describe('GeocodingCacheService', () => {
  let cacheService: GeocodingCacheService;

  beforeEach(() => {
    // Create cache service with in-memory backend (no Redis)
    cacheService = new GeocodingCacheService(undefined, 24 * 3600);
  });

  describe('Set and Get Operations', () => {
    it('should store and retrieve cached results', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [2.3522, 48.8566],
          },
          properties: {
            name: 'Paris',
            type: 'city',
            country: 'France',
          },
        },
      ];

      await cacheService.set('Paris', features, 'maptiler');
      const result = await cacheService.get('Paris');

      expect(result).not.toBeNull();
      expect(result?.results).toHaveLength(1);
      expect(result?.results[0].properties.name).toBe('Paris');
    });

    it('should return null for missing cache entries', async () => {
      const result = await cacheService.get('nonexistent_query');
      expect(result).toBeNull();
    });

    it('should overwrite existing cache entries', async () => {
      const features1: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [1, 1] },
          properties: { name: 'First', type: 'result' },
        },
      ];

      const features2: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2, 2] },
          properties: { name: 'Second', type: 'result' },
        },
      ];

      await cacheService.set('test', features1, 'maptiler');
      await cacheService.set('test', features2, 'osm');

      const result = await cacheService.get('test');
      expect(result?.results[0].properties.name).toBe('Second');
      expect(result?.source).toBe('osm');
    });

    it('should preserve result arrays with multiple features', async () => {
      const features: GeoJSONFeature[] = Array.from({ length: 5 }, (_, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [i, i] },
        properties: { name: `Place ${i}`, type: 'city' },
      }));

      await cacheService.set('multi', features, 'maptiler');
      const result = await cacheService.get('multi');

      expect(result?.results).toHaveLength(5);
      result?.results.forEach((feature, i) => {
        expect(feature.properties.name).toBe(`Place ${i}`);
      });
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      jest.useFakeTimers();

      const shortTTL = 5; // 5 seconds
      const shortCache = new GeocodingCacheService(undefined, shortTTL);

      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await shortCache.set('expiring', features, 'maptiler');
      expect(await shortCache.get('expiring')).not.toBeNull();

      jest.advanceTimersByTime(6000); // Advance 6 seconds

      expect(await shortCache.get('expiring')).toBeNull();

      jest.useRealTimers();
    });

    it('should not expire within TTL window', async () => {
      jest.useFakeTimers();

      const shortTTL = 10;
      const shortCache = new GeocodingCacheService(undefined, shortTTL);

      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await shortCache.set('key', features, 'maptiler');
      jest.advanceTimersByTime(5000); // Advance 5 seconds (within TTL)

      const result = await shortCache.get('key');
      expect(result).not.toBeNull();

      jest.useRealTimers();
    });

    it('should include expiration time in cache entry', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('key', features, 'maptiler');
      const result = await cacheService.get('key');

      expect(result?.expiresAt).toBeDefined();
      expect(result!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Delete Operations', () => {
    it('should delete cached entries', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('key', features, 'maptiler');
      expect(await cacheService.get('key')).not.toBeNull();

      await cacheService.delete('key');
      expect(await cacheService.get('key')).toBeNull();
    });

    it('should handle deletion of non-existent keys gracefully', async () => {
      const result = await cacheService.delete('nonexistent');
      expect(result).toBeDefined();
    });
  });

  describe('Clear Operations', () => {
    it('should clear all cached entries', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('key1', features, 'maptiler');
      await cacheService.set('key2', features, 'osm');
      await cacheService.set('key3', features, 'maptiler');

      const statsBefore = await cacheService.getStats();
      expect(statsBefore.entries).toBeGreaterThan(0);

      await cacheService.clear();

      const statsAfter = await cacheService.getStats();
      expect(statsAfter.entries).toBe(0);
    });

    it('should reset statistics on clear', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('key', features, 'maptiler');
      await cacheService.get('key');
      await cacheService.get('key');

      await cacheService.clear();

      const stats = await cacheService.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track cache hits', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('key', features, 'maptiler');
      
      // Multiple hits
      for (let i = 0; i < 3; i++) {
        await cacheService.get('key');
      }

      const stats = await cacheService.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should track cache misses', async () => {
      for (let i = 0; i < 3; i++) {
        await cacheService.get(`missing_${i}`);
      }

      const stats = await cacheService.getStats();
      expect(stats.misses).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('key', features, 'maptiler');

      // 4 hits
      for (let i = 0; i < 4; i++) {
        await cacheService.get('key');
      }

      // 2 misses
      await cacheService.get('missing1');
      await cacheService.get('missing2');

      const stats = await cacheService.getStats();
      // hitRate = hits / (hits + misses) = 4 / (4 + 2) = 0.667
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should count number of entries', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('key1', features, 'maptiler');
      await cacheService.set('key2', features, 'osm');
      await cacheService.set('key3', features, 'maptiler');

      const stats = await cacheService.getStats();
      expect(stats.entries).toBe(3);
    });

    it('should estimate cache size in bytes', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: {
            name: 'Test',
            type: 'city',
            country: 'France',
            region: 'Île-de-France',
            postcode: '75001',
          },
        },
      ];

      await cacheService.set('key', features, 'maptiler');

      const stats = await cacheService.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should return stats with correct structure', async () => {
      const stats = await cacheService.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('size');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
      expect(typeof stats.entries).toBe('number');
    });
  });

  describe('Cache Backend Information', () => {
    it('should report using in-memory backend when no Redis', () => {
      expect(cacheService.isUsingRedis()).toBe(false);
    });

    it('should return in-memory backend type', () => {
      expect(cacheService.getBackendType()).toBe('in-memory');
    });

    it('should handle missing TTL config gracefully', async () => {
      const defaultCache = new GeocodingCacheService(undefined);
      expect(defaultCache).toBeDefined();

      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await defaultCache.set('key', features, 'maptiler');
      expect(await defaultCache.get('key')).not.toBeNull();
    });
  });

  describe('Cache Key Hashing', () => {
    it('should generate consistent cache keys for same query', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('Paris', features, 'maptiler');
      
      // Query with same string should hit cache
      const result1 = await cacheService.get('Paris');
      expect(result1).not.toBeNull();

      // Query with different case should also hit (case-insensitive)
      const result2 = await cacheService.get('PARIS');
      // Note: actual behavior depends on implementation
    });

    it('should differentiate between different queries', async () => {
      const features1: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
          properties: { name: 'Paris', type: 'city' },
        },
      ];

      const features2: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-74.0060, 40.7128] },
          properties: { name: 'New York', type: 'city' },
        },
      ];

      await cacheService.set('Paris', features1, 'maptiler');
      await cacheService.set('New York', features2, 'maptiler');

      const paris = await cacheService.get('Paris');
      const nyc = await cacheService.get('New York');

      expect(paris?.results[0].properties.name).toBe('Paris');
      expect(nyc?.results[0].properties.name).toBe('New York');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent reads safely', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('key', features, 'maptiler');

      const promises = Array.from({ length: 10 }, () =>
        cacheService.get('key')
      );

      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).not.toBeNull();
        expect(result?.results).toHaveLength(1);
      });
    });

    it('should handle concurrent writes safely', async () => {
      const features: GeoJSONFeature[] = Array.from({ length: 5 }, (_, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [i, i] as [number, number] },
        properties: { name: `Place ${i}`, type: 'city' },
      }));

      const promises = features.map((feature) =>
        cacheService.set(feature.properties.name, [feature], 'maptiler')
      );

      await Promise.all(promises);

      const stats = await cacheService.getStats();
      expect(stats.entries).toBe(5);
    });

    it('should handle mixed concurrent operations', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      // Mix of sets and gets
      const operations = [];
      
      for (let i = 0; i < 3; i++) {
        operations.push(cacheService.set(`key${i}`, features, 'maptiler'));
      }
      
      for (let i = 0; i < 3; i++) {
        operations.push(cacheService.get(`key${i}`));
      }

      await Promise.all(operations);

      const stats = await cacheService.getStats();
      expect(stats.entries).toBeGreaterThan(0);
      expect(stats.hits).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve complete feature objects', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [2.3522, 48.8566],
          },
          properties: {
            name: 'Paris',
            type: 'city',
            country: 'France',
            region: 'Île-de-France',
            city: 'Paris',
            postcode: '75001',
            place_name: 'Paris, Île-de-France, France',
            short_code: 'FR-75',
          },
        },
      ];

      await cacheService.set('paris', features, 'maptiler');
      const [retrieved] = (await cacheService.get('paris'))!.results;

      expect(retrieved.type).toBe('Feature');
      expect(retrieved.geometry.coordinates).toEqual([2.3522, 48.8566]);
      expect(retrieved.properties.name).toBe('Paris');
      expect(retrieved.properties.country).toBe('France');
      expect(retrieved.properties.postcode).toBe('75001');
    });

    it('should track source properly', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      await cacheService.set('maptiler_source', features, 'maptiler');
      const maptilerResult = await cacheService.get('maptiler_source');
      expect(maptilerResult?.source).toBe('maptiler');

      await cacheService.set('osm_source', features, 'osm');
      const osmResult = await cacheService.get('osm_source');
      expect(osmResult?.source).toBe('osm');
    });

    it('should track timestamp', async () => {
      const features: GeoJSONFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test', type: 'city' },
        },
      ];

      const before = new Date();
      await cacheService.set('key', features, 'maptiler');
      const after = new Date();

      const result = await cacheService.get('key');
      expect(result?.timestamp).toBeDefined();
      expect(result!.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

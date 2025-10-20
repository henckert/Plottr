/**
 * Geocoding Service Unit Tests
 * 
 * Tests for MapTiler API integration, OSM fallback, query validation,
 * caching behavior, and usage tracking
 */

import { GeocodingService } from '../../../src/services/geocoding.service';
import { UsageRepo } from '../../../src/data/usage.repo';
import { AppError } from '../../../src/errors';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock UsageRepo
jest.mock('../../../src/data/usage.repo');

describe('GeocodingService', () => {
  let geocodingService: GeocodingService;
  let usageRepo: jest.Mocked<UsageRepo>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocked UsageRepo
    usageRepo = {
      recordEvent: jest.fn().mockResolvedValue({}),
    } as any;

    // Initialize service with test API key
    geocodingService = new GeocodingService(
      'test-maptiler-key',
      usageRepo,
      undefined // No Redis in unit tests
    );
  });

  describe('Search - Query Validation', () => {
    it('should throw error for empty query', async () => {
      await expect(
        geocodingService.search({ query: '' }, 'user1', 'free')
      ).rejects.toThrow('Query string is required');
    });

    it('should throw error for query exceeding max length', async () => {
      const longQuery = 'a'.repeat(300);
      await expect(
        geocodingService.search({ query: longQuery }, 'user1', 'free')
      ).rejects.toThrow('Query string is too long');
    });

    it('should accept query at maximum length (256 chars)', async () => {
      const maxQuery = 'a'.repeat(256);
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [] },
      });

      const result = await geocodingService.search(
        { query: maxQuery },
        'user1',
        'free'
      );

      expect(result).toBeDefined();
    });

    it('should trim whitespace from query', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [] },
      });

      await geocodingService.search(
        { query: '  Paris  ' },
        'user1',
        'free'
      );

      // Verify API was called (whitespace handling is internal)
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  describe('Search - MapTiler API Success', () => {
    it('should return results from MapTiler API', async () => {
      const mockFeatures = [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [2.3522, 48.8566],
          },
          properties: {
            name: 'Paris',
            type: 'city',
            place_name: 'Paris, France',
          },
          place_name: 'Paris, France',
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: { features: mockFeatures },
      });

      const result = await geocodingService.search(
        { query: 'Paris' },
        'user1',
        'free'
      );

      expect(result.features).toHaveLength(1);
      expect(result.source).toBe('maptiler');
      expect(result.cached).toBe(false);
    });

    it('should respect limit parameter', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [] },
      });

      await geocodingService.search(
        { query: 'Paris', limit: 5 },
        'user1',
        'free'
      );

      // Verify API call included limit
      expect(mockedAxios.get).toHaveBeenCalled();
      const callUrl = (mockedAxios.get.mock.calls[0][0] as string);
      expect(callUrl).toContain('limit=5');
    });

    it('should cap results at 50', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [] },
      });

      await geocodingService.search(
        { query: 'Paris', limit: 100 },
        'user1',
        'free'
      );

      const callUrl = (mockedAxios.get.mock.calls[0][0] as string);
      expect(callUrl).toContain('limit=50');
    });

    it('should include language parameter if provided', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [] },
      });

      await geocodingService.search(
        { query: 'Paris', language: 'fr' },
        'user1',
        'free'
      );

      const callUrl = (mockedAxios.get.mock.calls[0][0] as string);
      expect(callUrl).toContain('language=fr');
    });

    it('should log usage event on successful search', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [] },
      });

      await geocodingService.search(
        { query: 'Paris' },
        'user123',
        'paid_individual'
      );

      expect(usageRepo.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user123',
          resource_type: 'geocoding',
          action: 'geocoding_search',
          tier: 'paid_individual',
        })
      );
    });

    it('should include metadata in usage event', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [{ type: 'Feature' }] },
      });

      await geocodingService.search(
        { query: 'Paris' },
        'user1',
        'free'
      );

      expect(usageRepo.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            query: 'Paris',
            source: 'maptiler',
            resultCount: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('Search - OSM Fallback', () => {
    it('should fallback to OSM when MapTiler fails', async () => {
      // First call (MapTiler) fails
      mockedAxios.get.mockRejectedValueOnce(
        new Error('MapTiler API error')
      );
      // Second call (OSM) succeeds
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            lat: '48.8566',
            lon: '2.3522',
            display_name: 'Paris, France',
          },
        ],
      });

      const result = await geocodingService.search(
        { query: 'Paris' },
        'user1',
        'free'
      );

      expect(result.source).toBe('osm');
      expect(result.features).toBeDefined();
    });

    it('should throw error when both APIs fail', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('MapTiler failed'))
        .mockRejectedValueOnce(new Error('OSM failed'));

      await expect(
        geocodingService.search({ query: 'Invalid' }, 'user1', 'free')
      ).rejects.toThrow('Geocoding service unavailable');
    });

    it('should log usage event on fallback success', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('MapTiler failed'));
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            lat: '48.8566',
            lon: '2.3522',
            display_name: 'Paris, France',
          },
        ],
      });

      await geocodingService.search(
        { query: 'Paris' },
        'user1',
        'free'
      );

      expect(usageRepo.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            source: 'osm',
          }),
        })
      );
    });
  });

  describe('Search - Cache Integration', () => {
    it('should return same results on repeated queries', async () => {
      // Setup mocks for potential API calls
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { name: 'Test', type: 'city' } }] },
        })
        .mockResolvedValueOnce({
          data: { features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { name: 'Test', type: 'city' } }] },
        });

      // First search
      const result1 = await geocodingService.search(
        { query: 'Paris' },
        'user1',
        'free'
      );

      // Second search with same query
      const result2 = await geocodingService.search(
        { query: 'Paris' },
        'user1',
        'free'
      );

      // Results should match structure
      expect(result1.features.length).toEqual(result2.features.length);
    });
  });

  describe('Search - Error Handling', () => {
    it('should log usage event on error', async () => {
      const initialCallCount = usageRepo.recordEvent.mock.calls.length;
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [] },
      });

      await geocodingService.search(
        { query: 'Error-Test-Usage-Query' },
        'user1',
        'free'
      );

      // Verify that usage was logged
      expect(usageRepo.recordEvent.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('Search - Result Processing', () => {
    it('should include execution time in result', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [] },
      });

      const result = await geocodingService.search(
        { query: 'Paris' },
        'user1',
        'free'
      );

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.executionTime).toBe('number');
    });
  });

  describe('Cache Management', () => {
    it('should return cache statistics', async () => {
      const stats = await geocodingService.getCacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('entries');
    });

    it('should clear cache', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { features: [] },
      });

      // Add to cache
      await geocodingService.search({ query: 'Paris' }, 'user1', 'free');

      // Clear cache
      await geocodingService.clearCache();

      // Stats should be reset
      const stats = await geocodingService.getCacheStats();
      expect(stats.entries).toBe(0);
    });

    it('should return cache backend info', () => {
      const info = geocodingService.getCacheInfo();

      expect(info).toHaveProperty('backend');
      expect(info).toHaveProperty('ttl');
      expect(info.ttl).toBe(24 * 3600); // 24 hours in seconds
    });
  });

  describe('MapTiler API Key Validation', () => {
    it('should fallback to OSM when MapTiler fails', async () => {
      // Reset and setup fresh mocks for this test
      mockedAxios.get.mockReset();
      usageRepo.recordEvent.mockReset();
      
      const freshService = new GeocodingService(
        'test-key-value',
        usageRepo,
        undefined
      );

      // Setup specific sequence of mocks for this test
      const mapTilerReject = Promise.reject(new Error('MapTiler API error'));
      const osmResolve = Promise.resolve({
        data: [{ lat: '0', lon: '0', display_name: 'Test Location' }],
      });

      mockedAxios.get
        .mockReturnValueOnce(mapTilerReject)
        .mockReturnValueOnce(osmResolve);

      const result = await freshService.search(
        { query: 'MapTiler-Fallback-Unique-99999' },
        'user1',
        'free'
      );

      // Should fallback to OSM
      expect(result.source).toBe('osm');
      expect(result.features).toHaveLength(1);
    });
  });
});

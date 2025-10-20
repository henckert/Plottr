/**
 * Geocoding API Routes
 * 
 * Endpoints for location search and geocoding functionality
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import GeocodingService from '../services/geocoding.service';
import { UsageRepo } from '../data/usage.repo';
import { AppError } from '../errors';
import { GeocodingRequest } from '../lib/geocoding.types';

/**
 * Create geocoding routes
 */
export function createGeocodingRoutes(): Router {
  const router = Router();

  // Initialize services
  const usageRepo = new UsageRepo();
  const maptilerKey = process.env.MAPTILER_API_KEY || 'YOUR_MAPTILER_KEY_HERE';
  const redisUrl = process.env.REDIS_URL;
  const geocodingService = new GeocodingService(maptilerKey, usageRepo, redisUrl);

  /**
   * Search for locations
   * GET /api/geocode/search?q=query&limit=10&proximity=lng,lat
   */
  router.get(
    '/search',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { q, limit, language, proximity, bbox } = req.query;

        // Validate required parameter
        if (!q || typeof q !== 'string') {
          throw new AppError('Query parameter (q) is required', 400, 'MISSING_QUERY');
        }

        // Parse optional parameters
        const parsedLimit = limit ? parseInt(limit as string) : 10;
        const parsedProximity = proximity
          ? (proximity as string).split(',').map(Number) as [number, number]
          : undefined;
        const parsedBbox = bbox
          ? (bbox as string).split(',').map(Number) as [number, number, number, number]
          : undefined;

        const searchRequest: GeocodingRequest = {
          query: q,
          limit: Math.min(parsedLimit, 50), // Cap at 50 results
          language: language as string | undefined,
          proximity: parsedProximity,
          bbox: parsedBbox,
        };

        // Perform search
        const results = await geocodingService.search(
          searchRequest,
          req.user?.clerkId || 'anonymous',
          req.user?.tier || 'free'
        );

        // Return results with cache info
        res.json({
          success: true,
          data: results.features,
          metadata: {
            source: results.source,
            cached: results.cached,
            count: results.features.length,
            executionTime: results.executionTime,
          },
        });
      } catch (error) {
        if (error instanceof AppError) {
          res.status(error.status).json({
            success: false,
            error: {
              message: error.message,
              code: error.code,
            },
          });
        } else {
          console.error('Geocoding search error:', error);
          res.status(500).json({
            success: false,
            error: {
              message: 'Failed to search locations',
              code: 'SEARCH_ERROR',
            },
          });
        }
      }
    }
  );

  /**
   * Get reverse geocoding (coordinates to address)
   * GET /api/geocode/reverse?lng=longitude&lat=latitude
   */
  router.get(
    '/reverse',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { lng, lat } = req.query;

        // Validate coordinates
        if (!lng || !lat) {
          throw new AppError(
            'Longitude (lng) and latitude (lat) parameters are required',
            400,
            'MISSING_COORDINATES'
          );
        }

        const longitude = parseFloat(lng as string);
        const latitude = parseFloat(lat as string);

        if (isNaN(longitude) || isNaN(latitude)) {
          throw new AppError('Invalid coordinates format', 400, 'INVALID_COORDINATES');
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          throw new AppError('Coordinates out of valid range', 400, 'COORDINATES_OUT_OF_RANGE');
        }

        // Perform reverse search
        const searchRequest: GeocodingRequest = {
          query: `${latitude},${longitude}`,
        };

        const results = await geocodingService.search(
          searchRequest,
          req.user?.clerkId || 'anonymous',
          req.user?.tier || 'free'
        );

        res.json({
          success: true,
          data: results.features[0] || null,
          metadata: {
            source: results.source,
            cached: results.cached,
            executionTime: results.executionTime,
          },
        });
      } catch (error) {
        if (error instanceof AppError) {
          res.status(error.status).json({
            success: false,
            error: {
              message: error.message,
              code: error.code,
            },
          });
        } else {
          console.error('Reverse geocoding error:', error);
          res.status(500).json({
            success: false,
            error: {
              message: 'Failed to reverse geocode',
              code: 'REVERSE_GEOCODE_ERROR',
            },
          });
        }
      }
    }
  );

  /**
   * Get cache statistics
   * GET /api/geocode/cache/stats
   */
  router.get(
    '/cache/stats',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const stats = await geocodingService.getCacheStats();
        const info = geocodingService.getCacheInfo();

        res.json({
          success: true,
          data: {
            ...stats,
            ...info,
          },
        });
      } catch (error) {
        console.error('Cache stats error:', error);
        res.status(500).json({
          success: false,
          error: {
            message: 'Failed to get cache statistics',
            code: 'CACHE_STATS_ERROR',
          },
        });
      }
    }
  );

  /**
   * Clear cache (admin only)
   * POST /api/geocode/cache/clear
   */
  router.post(
    '/cache/clear',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Check if user is admin
        if (req.user?.tier !== 'admin') {
          throw new AppError(
            'Only admins can clear cache',
            403,
            'UNAUTHORIZED'
          );
        }

        await geocodingService.clearCache();

        res.json({
          success: true,
          message: 'Cache cleared successfully',
        });
      } catch (error) {
        if (error instanceof AppError) {
          res.status(error.status).json({
            success: false,
            error: {
              message: error.message,
              code: error.code,
            },
          });
        } else {
          console.error('Clear cache error:', error);
          res.status(500).json({
            success: false,
            error: {
              message: 'Failed to clear cache',
              code: 'CLEAR_CACHE_ERROR',
            },
          });
        }
      }
    }
  );

  return router;
}

export default createGeocodingRoutes;

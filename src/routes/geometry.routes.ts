/**
 * Geometry API Routes
 * 
 * Endpoints for boundary import (GeoJSON/KML)
 * POST /api/geometries/import - Import and validate boundary file with tier protection
 */

import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import GeometryImportService from '../services/geometry.import.service';
import { UsageService } from '../services/usage.service';
import { UsageRepo } from '../data/usage.repo';
import { BoundariesRepo } from '../data/boundaries.repo';
import { AppError } from '../errors';

// Test environment bypass
const BYPASS_QUOTA = process.env.BYPASS_QUOTA === '1';

/**
 * Create geometry routes
 */
export function createGeometryRoutes(): Router {
  const router = Router();
  const geometryService = new GeometryImportService();
  const usageRepo = new UsageRepo();
  const usageService = new UsageService(usageRepo);
  const boundariesRepo = new BoundariesRepo();

  /**
   * POST /api/geometries/import
   * 
   * Import and validate a boundary from GeoJSON or KML file
   * Enforces tier-based usage limits and saves to boundaries table
   * 
   * Expected payload: multipart/form-data with "file" field
   * File content: GeoJSON or KML
   * 
   * Response:
   * {
   *   valid: boolean,
   *   boundary_id?: number,        // database ID if saved
   *   boundary: [[lng, lat], ...], // polygon coordinates
   *   area: number,                // in square meters
   *   bbox: [minLng, minLat, maxLng, maxLat],
   *   message: string,
   *   warnings?: string[]
   * }
   */
  router.post(
    '/import',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Check if file was uploaded
        if (!req.file) {
          throw new AppError('No file provided', 400, 'MISSING_FILE');
        }

        const { originalname, buffer, mimetype } = req.file;
        const userId = req.user?.clerkId;

        if (!userId) {
          throw new AppError('User ID not found', 401, 'UNAUTHORIZED');
        }

        // Convert buffer to string
        let fileContent: string;
        try {
          fileContent = buffer.toString('utf-8');
        } catch {
          throw new AppError(
            'Unable to read file content',
            400,
            'FILE_READ_ERROR'
          );
        }

        // Validate file size (max 5MB)
        const maxFileSizeBytes = 5 * 1024 * 1024;
        if (buffer.length > maxFileSizeBytes) {
          throw new AppError(
            `File is too large. Maximum size: 5 MB`,
            400,
            'FILE_TOO_LARGE'
          );
        }

        // Get current usage and tier info (bypass in test environment)
        if (!BYPASS_QUOTA) {
          const quotaStatus = await usageService.getQuotaStatus(userId);

          // Check if user has reached their monthly limit for boundary imports
          // For now, we'll use a simple limit: free users can import 10 boundaries/month, pro/enterprise unlimited
          const BOUNDARY_LIMITS: Record<string, number> = {
            free: 10,
            pro: 1000,
            enterprise: 10000,
          };

          const monthlyImportLimit = BOUNDARY_LIMITS[quotaStatus.tier] || 10;
          const currentImports = await boundariesRepo.countCurrentMonth(userId);

          if (currentImports >= monthlyImportLimit) {
            throw new AppError(
              `You have reached your monthly boundary import limit (${monthlyImportLimit}/month for ${quotaStatus.tier} tier). Upgrade your plan or wait until next month.`,
              429,
              'IMPORT_LIMIT_EXCEEDED'
            );
          }
        }

        // Import and validate geometry
        const result = await geometryService.import(
          fileContent,
          originalname,
          mimetype
        );

        // Save to boundaries table
        let boundary_id: number | undefined;
        try {
          const saved = await boundariesRepo.create({
            user_id: userId,
            file_name: originalname,
            file_mime_type: mimetype || 'unknown',
            geometry: result.geometry_geojson ? JSON.stringify(result.geometry_geojson) : JSON.stringify({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [result.boundary],
              },
              properties: {},
            }),
            area_m2: result.area,
            bbox: result.bbox,
            is_valid: result.valid,
            validation_errors: undefined,
            warnings: result.warnings,
          });
          boundary_id = saved.id;
        } catch (error) {
          console.error('Failed to save boundary to database:', error);
          // Don't fail the import, just warn the user
          result.warnings = result.warnings || [];
          result.warnings.push('Geometry imported successfully but failed to save to database. Please refresh to see if it was persisted.');
        }

        res.json({
          ...result,
          boundary_id,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

export default createGeometryRoutes;

/**
 * Sites Service - Business logic layer for site management
 * Handles geocoding, PostGIS validation, version token conflicts
 */

import { SitesRepository, Site, SiteCreateInput, SiteUpdateInput } from '../data/sites.repo';
import { AppError } from '../errors';
import { Logger } from '../lib/logger';
import { validatePitchPolygon } from '../lib/geospatial';
import { forwardGeocode } from './geocode.service';

const logger = new Logger({ service: 'SitesService' });

export class SitesService {
  private repo: SitesRepository;

  constructor() {
    this.repo = new SitesRepository();
  }

  /**
   * Create a new site with optional geocoding and bbox validation
   * 
   * Geocoding flow:
   * 1. If location provided manually → use it (skip geocoding)
   * 2. Else if address provided + Mapbox available → geocode address
   * 3. Else → proceed without location (nullable)
   * 
   * @param data - Site creation input
   * @returns Created site with geocoded location (if available)
   */
  async create(data: SiteCreateInput): Promise<Site> {
    let locationData = data.location;

    // Geocoding flow
    if (!locationData && data.address) {
      try {
        // Attempt to geocode address
        const geocodeQuery = [
          data.address,
          data.city,
          data.state,
          data.country,
          data.postal_code,
        ]
          .filter(Boolean)
          .join(', ');

        const geocodeResult = await forwardGeocode(geocodeQuery, 1);

        if (geocodeResult.features && geocodeResult.features.length > 0) {
          const [lon, lat] = geocodeResult.features[0].center;
          locationData = {
            type: 'Point',
            coordinates: [lon, lat],
          };

          logger.info('Geocoded site location', {
            address: geocodeQuery,
            location: locationData,
          });
        } else {
          logger.warn('Geocoding returned no results', {
            address: geocodeQuery,
          });
        }
      } catch (err) {
        // Graceful degradation: log error but continue without location
        // (Mapbox token may be missing or API may be unavailable)
        logger.warn('Geocoding failed, creating site without location', {
          address: data.address,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Validate bbox if provided
    if (data.bbox) {
      const bboxError = validatePitchPolygon(data.bbox);
      if (bboxError) {
        throw new AppError(
          `Invalid bbox: ${bboxError.message}`,
          400,
          'INVALID_BBOX'
        );
      }
    }

    // Create site with geocoded location (or null if geocoding failed/unavailable)
    const createData: SiteCreateInput = {
      ...data,
      location: locationData,
    };

    const site = await this.repo.create(createData);
    return site;
  }

  /**
   * Get a site by ID
   * @param id - Site ID
   * @returns Site if found
   * @throws AppError(404) if not found
   */
  async get(id: number): Promise<Site> {
    const site = await this.repo.findById(id);
    if (!site) {
      throw new AppError('Site not found', 404, 'SITE_NOT_FOUND');
    }
    return site;
  }

  /**
   * List sites for a club with cursor-based pagination
   * @param clubId - Club ID to filter by
   * @param limit - Number of records to fetch (caller should request limit+1 to detect has_more)
   * @param cursor - Optional cursor for pagination
   * @returns Array of sites (length may be limit+1 if has_more)
   */
  async listPaginated(clubId: number, limit: number, cursor?: string): Promise<Site[]> {
    return this.repo.findByClubId(clubId, limit, cursor);
  }

  /**
   * Update a site with version token check
   * @param id - Site ID
   * @param versionToken - Current version token from client (If-Match header)
   * @param data - Partial update data
   * @returns Updated site
   * @throws AppError(404) if not found
   * @throws AppError(409) if version token is stale
   * @throws AppError(400) if bbox is invalid
   */
  async update(id: number, versionToken: string, data: SiteUpdateInput): Promise<Site> {
    // Check if site exists first
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError('Site not found', 404, 'SITE_NOT_FOUND');
    }

    // Check version token
    const isValidToken = await this.repo.checkVersionToken(id, versionToken);
    if (!isValidToken) {
      logger.warn('Version conflict detected', {
        siteId: id,
        providedToken: versionToken,
      });
      throw new AppError(
        'Version conflict: site was modified by another client. Please refresh and try again.',
        409,
        'VERSION_CONFLICT'
      );
    }

    // Validate bbox if provided in update
    if (data.bbox) {
      const bboxError = validatePitchPolygon(data.bbox);
      if (bboxError) {
        throw new AppError(
          `Invalid bbox: ${bboxError.message}`,
          400,
          'INVALID_BBOX'
        );
      }
    }

    // Perform update
    const updated = await this.repo.update(id, data);
    if (!updated) {
      throw new AppError('Site not found', 404, 'SITE_NOT_FOUND');
    }

    return updated;
  }

  /**
   * Soft delete a site with version token check
   * @param id - Site ID
   * @param versionToken - Current version token from client (If-Match header)
   * @returns void
   * @throws AppError(404) if not found
   * @throws AppError(409) if version token is stale
   */
  async delete(id: number, versionToken: string): Promise<void> {
    // Check if site exists first
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError('Site not found', 404, 'SITE_NOT_FOUND');
    }

    // Check version token
    const isValidToken = await this.repo.checkVersionToken(id, versionToken);
    if (!isValidToken) {
      logger.warn('Version conflict on delete', {
        siteId: id,
        providedToken: versionToken,
      });
      throw new AppError(
        'Version conflict: site was modified by another client. Please refresh and try again.',
        409,
        'VERSION_CONFLICT'
      );
    }

    // Perform soft delete
    const deleted = await this.repo.softDelete(id);
    if (!deleted) {
      throw new AppError('Site not found', 404, 'SITE_NOT_FOUND');
    }
  }
}

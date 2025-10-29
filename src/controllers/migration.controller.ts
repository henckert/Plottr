import { Request, Response, NextFunction } from 'express';
import { getKnex } from '@/data/knex';

/**
 * GET /api/migration/status
 * Check if venues table exists and has data that needs migration
 */
export async function getMigrationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const knex = getKnex();

    // Check if venues table exists
    const venuesTableExists = await knex.schema.hasTable('venues');
    
    if (!venuesTableExists) {
      // No venues table means migration complete or never needed
      const sitesCount = await knex('sites').count('* as count').first();
      return res.json({
        needs_migration: false,
        sites_count: parseInt(sitesCount?.count as string || '0', 10),
        message: 'Migration complete - using Sites schema',
      });
    }

    // Count records in both tables
    const venuesCount = await knex('venues').count('* as count').first();
    const sitesCount = await knex('sites').count('* as count').first();

    const venuesTotal = parseInt(venuesCount?.count as string || '0', 10);
    const sitesTotal = parseInt(sitesCount?.count as string || '0', 10);

    // If sites >= venues, migration is complete
    if (sitesTotal >= venuesTotal && venuesTotal > 0) {
      return res.json({
        needs_migration: false,
        venues_count: venuesTotal,
        sites_count: sitesTotal,
        message: 'Migration complete',
      });
    }

    // If venues > 0 and sites < venues, migration needed
    if (venuesTotal > 0) {
      return res.json({
        needs_migration: true,
        venues_count: venuesTotal,
        sites_count: sitesTotal,
        message: `You have ${venuesTotal} venue${venuesTotal === 1 ? '' : 's'} that need${venuesTotal === 1 ? 's' : ''} to be migrated to sites`,
      });
    }

    // No data in either table
    return res.json({
      needs_migration: false,
      venues_count: 0,
      sites_count: 0,
      message: 'No migration needed - no existing data',
    });
  } catch (error) {
    next(error);
  }
}

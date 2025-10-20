/**
 * Test-only routes for E2E testing
 * Only available when E2E=true environment variable is set
 */

import { Router } from 'express';
import { getKnex } from '../data/knex';

const router = Router();

/**
 * POST /api/test/seed - Seed test data for E2E tests
 * Creates a test club if it doesn't exist
 * Returns the club_id to use in subsequent tests
 */
router.post('/seed', async (req, res, next) => {
  try {
    const knex = getKnex();
    
    // Check if test club already exists
    let club = await knex('clubs')
      .where({ name: 'E2E Test Club' })
      .first();

    if (!club) {
      // Create test club
      const [clubId] = await knex('clubs')
        .insert({
          name: 'E2E Test Club',
          slug: 'e2e-test-club',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id');

      club = { id: typeof clubId === 'object' ? clubId.id : clubId };
    }

    res.json({
      success: true,
      clubId: club.id,
    });
  } catch (error: any) {
    console.error('Seed endpoint error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to seed test data',
        code: error.code || 'SEED_ERROR',
        detail: error.detail,
      },
    });
  }
});

/**
 * POST /api/test/cleanup - Clean up test data
 * Removes all E2E test data from database
 */
router.post('/cleanup', async (req, res, next) => {
  try {
    const knex = getKnex();
    
    // Get test club ID
    const club = await knex('clubs')
      .where({ name: 'E2E Test Club' })
      .first();

    if (!club) {
      return res.json({ success: true, message: 'No test data to clean' });
    }

    // Delete cascade: sites → layouts → zones
    // Sites will cascade delete layouts via foreign key
    await knex('sites')
      .where({ club_id: club.id })
      .delete();

    // Delete test club
    await knex('clubs')
      .where({ id: club.id })
      .delete();

    res.json({
      success: true,
      message: 'Test data cleaned up',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Knex } from 'knex';

/**
 * Migration: Migrate venues data to sites table
 * 
 * This migration preserves existing venue data during the platform pivot
 * from sports booking to field layout designer.
 * 
 * Mapping:
 * - venues.id → preserved for reference (not copied to sites.id)
 * - venues.club_id → sites.club_id
 * - venues.name → sites.name
 * - venues.address → sites.address
 * - venues.center_point → sites.location
 * - venues.bbox → sites.bbox
 * - venues.version_token → sites.version_token (converted from varchar to uuid)
 * - venues.created_at → sites.created_at
 * - venues.updated_at → sites.updated_at
 * 
 * Note: venues.tz (timezone), venues.published fields are not migrated
 * as they're not relevant to the new sites model.
 */

export async function up(knex: Knex): Promise<void> {
  // Check if there are venues to migrate
  const venueCount = await knex('venues').count('* as count').first();
  const count = parseInt(venueCount?.count as string || '0', 10);

  if (count === 0) {
    console.log('✓ No venues to migrate (venues table is empty)');
    return;
  }

  console.log(`→ Migrating ${count} venues to sites table...`);

  // Migrate venues to sites
  // Note: version_token in venues is varchar, in sites it's uuid
  // We generate new UUIDs for sites instead of trying to convert
  await knex.raw(`
    INSERT INTO sites (
      club_id, 
      name, 
      address, 
      city, 
      state, 
      country, 
      postal_code,
      location, 
      bbox, 
      version_token,
      created_at, 
      updated_at
    )
    SELECT 
      v.club_id,
      v.name,
      v.address,
      NULL as city,        -- venues table doesn't have city field
      NULL as state,       -- venues table doesn't have state field
      'USA' as country,    -- default country
      NULL as postal_code, -- venues table doesn't have postal_code field
      v.center_point as location,
      v.bbox,
      gen_random_uuid() as version_token, -- generate new UUID
      v.created_at,
      v.updated_at
    FROM venues v
    ORDER BY v.id
  `);

  const migratedCount = await knex('sites').count('* as count').first();
  const migrated = parseInt(migratedCount?.count as string || '0', 10);

  console.log(`✓ Migrated ${migrated} venues to sites table`);

  // Log sample of migrated data
  const samples = await knex('sites')
    .select('id', 'name', 'club_id')
    .orderBy('id')
    .limit(3);
  
  console.log('  Sample sites:', samples.map(s => `${s.id}:${s.name}`).join(', '));
}

export async function down(knex: Knex): Promise<void> {
  // Rollback: Delete all sites (assumes sites were only created by this migration)
  const deletedCount = await knex('sites').del();
  console.log(`✓ Rolled back: Deleted ${deletedCount} sites`);
}

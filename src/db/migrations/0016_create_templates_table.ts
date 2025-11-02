import { Knex } from 'knex';

/**
 * Migration: Restructure templates table for zone/asset presets
 * 
 * Changes from old schema (0011):
 * - DROP tags TEXT[], preview_geometry JSONB, usage_count
 * - ADD sport_type VARCHAR(100), zones_json JSONB, assets_json JSONB, thumbnail_url VARCHAR(500)
 * - CHANGE created_by from VARCHAR(100) to UUID (FK to users table)
 */

export async function up(knex: Knex): Promise<void> {
  // Drop old columns
  await knex.schema.alterTable('templates', (table) => {
    table.dropColumn('tags');
    table.dropColumn('preview_geometry');
    table.dropColumn('usage_count');
  });

  // Drop old indexes
  await knex.raw(`DROP INDEX IF EXISTS idx_templates_tags`);
  await knex.raw(`DROP INDEX IF EXISTS idx_templates_usage_count`);

  // Add new columns
  // Add columns individually if missing
  const addColumn = async (col: string, cb: (table: any) => void) => {
    const exists = await knex.schema.hasColumn('templates', col);
    if (!exists) {
      await knex.schema.alterTable('templates', cb);
    }
  };

  await addColumn('sport_type', (table) => table.string('sport_type', 100));
  await addColumn('zones_json', (table) => table.jsonb('zones_json').notNullable());
  await addColumn('assets_json', (table) => table.jsonb('assets_json'));
  await addColumn('thumbnail_url', (table) => table.string('thumbnail_url', 500));
  await addColumn('created_by', (table) =>
    table.uuid('created_by')
      .notNullable()
      .defaultTo('00000000-0000-0000-0000-000000000000')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
  );
  await addColumn('preview_geometry', (table) => table.jsonb('preview_geometry').nullable());

  // Backfill preview_geometry and set NOT NULL
  const hasPreviewGeometry = await knex.schema.hasColumn('templates', 'preview_geometry');
  if (hasPreviewGeometry) {
    await knex('templates').update({ preview_geometry: knex.raw("'{}'::jsonb") }).whereNull('preview_geometry');
    await knex.raw('ALTER TABLE templates ALTER COLUMN preview_geometry SET NOT NULL;');
  }

  // Backfill created_by with a default UUID before making it NOT NULL
  // If users table exists, use a valid user id, else use a dummy UUID
  const dummyUserId = '00000000-0000-0000-0000-000000000000';
  // Insert dummy user if not exists to satisfy FK constraint
  await knex.raw(`INSERT INTO users (id, email, clerk_id, tier, is_active, created_at, updated_at) VALUES ('${dummyUserId}', 'migration-dummy@plottr.local', 'migration-dummy-clerk', 'free', true, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`);
  await knex.raw(`UPDATE templates SET created_by = '${dummyUserId}' WHERE created_by IS NULL`);

  // Alter created_by to UUID (drop and re-add)
  await knex.raw(`
    ALTER TABLE templates
    DROP COLUMN created_by,
    ADD COLUMN created_by UUID NOT NULL DEFAULT '${dummyUserId}';

    ALTER TABLE templates
    ADD CONSTRAINT fk_templates_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  `);

  // Create new indexes
  await knex.raw(`
    CREATE INDEX idx_templates_sport_type ON templates(sport_type);
  `);

  console.log('✓ Restructured templates table for zone/asset presets');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_templates_sport_type`);

  await knex.schema.alterTable('templates', (table) => {
    table.dropColumn('sport_type');
    table.dropColumn('zones_json');
    table.dropColumn('assets_json');
    table.dropColumn('thumbnail_url');
  });

  // Backfill created_by with a default value before NOT NULL constraint
  const dummyUserId = '00000000-0000-0000-0000-000000000000';
  // Insert dummy user if not exists to satisfy FK constraint
  await knex.raw(`INSERT INTO users (id, email, clerk_id, tier, is_active, created_at, updated_at) VALUES ('${dummyUserId}', 'migration-dummy@plottr.local', 'migration-dummy-clerk', 'free', true, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`);
  await knex.raw(`UPDATE templates SET created_by = '${dummyUserId}' WHERE created_by IS NULL`);
  await knex.raw(`
    ALTER TABLE templates
    DROP CONSTRAINT IF EXISTS fk_templates_created_by,
    DROP COLUMN created_by,
  ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT '${dummyUserId}';
  `);

  // Backfill preview_geometry for NOT NULL constraint BEFORE adding column as NOT NULL
  const previewGeometryExists = await knex.schema.hasColumn('templates', 'preview_geometry');
  if (previewGeometryExists) {
    await knex.raw(`UPDATE templates SET preview_geometry = '{}' WHERE preview_geometry IS NULL`);
  }
  // Drop NOT NULL constraint, then drop preview_geometry, then drop created_by
  const hasPreviewGeometry = await knex.schema.hasColumn('templates', 'preview_geometry');
  if (hasPreviewGeometry) {
    await knex.raw('ALTER TABLE templates ALTER COLUMN preview_geometry DROP NOT NULL;');
    await knex.schema.alterTable('templates', (table) => {
      table.dropColumn('preview_geometry');
    });
  }
  await knex.schema.alterTable('templates', (table) => {
    table.dropColumn('created_by');
    table.specificType('tags', 'TEXT[]');
    table.integer('usage_count').notNullable().defaultTo(0);
  });

  await knex.raw(`
    CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
    CREATE INDEX idx_templates_usage_count ON templates(usage_count DESC);
  `);

  console.log('✓ Reverted templates table restructure');
}


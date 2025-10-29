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
  await knex.schema.alterTable('templates', (table) => {
    table.string('sport_type', 100);
    table.jsonb('zones_json').notNullable();
    table.jsonb('assets_json');
    table.string('thumbnail_url', 500);
  });

  // Alter created_by to UUID (drop and re-add)
  await knex.raw(`
    ALTER TABLE templates
    DROP COLUMN created_by,
    ADD COLUMN created_by UUID;
    
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

  await knex.raw(`
    ALTER TABLE templates
    DROP CONSTRAINT IF EXISTS fk_templates_created_by,
    DROP COLUMN created_by,
    ADD COLUMN created_by VARCHAR(100) NOT NULL;
  `);

  await knex.schema.alterTable('templates', (table) => {
    table.specificType('tags', 'TEXT[]');
    table.jsonb('preview_geometry').notNullable();
    table.integer('usage_count').notNullable().defaultTo(0);
  });

  await knex.raw(`
    CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
    CREATE INDEX idx_templates_usage_count ON templates(usage_count DESC);
  `);

  console.log('✓ Reverted templates table restructure');
}


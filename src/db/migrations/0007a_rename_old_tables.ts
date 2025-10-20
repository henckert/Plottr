import { Knex } from 'knex';

/**
 * Migration: Rename old tables to preserve data during pivot
 * 
 * The platform is pivoting from sports booking to field layout designer.
 * This migration preserves old table data by renaming them with _deprecated suffix.
 * 
 * Tables renamed:
 * - layouts → layouts_deprecated (0 rows, but exists)
 * - templates → templates_deprecated (5 rows of pitch templates)
 * 
 * This allows new layouts/templates tables to be created with the new schema
 * while preserving old data for potential migration later.
 */

export async function up(knex: Knex): Promise<void> {
  // Check if old layouts table exists and rename it
  const layoutsExists = await knex.schema.hasTable('layouts');
  if (layoutsExists) {
    await knex.raw('ALTER TABLE layouts RENAME TO layouts_deprecated');
    console.log('✓ Renamed layouts → layouts_deprecated');
  }

  // Check if old templates table exists and rename it
  const templatesExists = await knex.schema.hasTable('templates');
  if (templatesExists) {
    await knex.raw('ALTER TABLE templates RENAME TO templates_deprecated');
    await knex.raw('ALTER SEQUENCE templates_id_seq RENAME TO templates_deprecated_id_seq');
    console.log('✓ Renamed templates → templates_deprecated (preserved 5 rows)');
  }
}

export async function down(knex: Knex): Promise<void> {
  // Restore old table names
  const layoutsDeprecatedExists = await knex.schema.hasTable('layouts_deprecated');
  if (layoutsDeprecatedExists) {
    await knex.raw('ALTER TABLE layouts_deprecated RENAME TO layouts');
    console.log('✓ Restored layouts_deprecated → layouts');
  }

  const templatesDeprecatedExists = await knex.schema.hasTable('templates_deprecated');
  if (templatesDeprecatedExists) {
    await knex.raw('ALTER TABLE templates_deprecated RENAME TO templates');
    await knex.raw('ALTER SEQUENCE templates_deprecated_id_seq RENAME TO templates_id_seq');
    console.log('✓ Restored templates_deprecated → templates');
  }
}

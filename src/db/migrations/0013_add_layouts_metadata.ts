import { Knex } from 'knex';

/**
 * Migration: Add metadata column to layouts table
 * 
 * Purpose: Store intent-based metadata for layouts created via the Intent Wizard.
 * 
 * Schema:
 * - metadata JSONB column (nullable for backwards compatibility)
 * - Contains: { intent: string, subtype?: string }
 * 
 * Examples:
 * - { "intent": "sports_tournament", "subtype": "gaa" }
 * - { "intent": "market" }
 * - { "intent": "construction", "subtype": "compound" }
 * 
 * This is non-breaking:
 * - Existing layouts will have metadata = NULL
 * - New layouts can optionally set metadata
 * - Frontend can filter/group layouts by intent
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('layouts', (table) => {
    table.jsonb('metadata').nullable();
  });

  // Add index for filtering by intent (extracts intent from JSONB)
  await knex.raw(`
    CREATE INDEX idx_layouts_metadata_intent 
    ON layouts ((metadata->>'intent')) 
    WHERE metadata IS NOT NULL;
  `);

  console.log('✓ Added metadata column to layouts table with intent index');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('layouts', (table) => {
    table.dropColumn('metadata');
  });

  console.log('✓ Dropped metadata column from layouts table');
}

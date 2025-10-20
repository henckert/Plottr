import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Skip - old pitch templates were moved to templates_deprecated table
  // New field layout templates are created in 005_field_layouts.ts
  console.log('  ⏭️  Skipping old pitch templates (deprecated)');
}

import { Knex } from 'knex';

/**
 * Migration: Create Usage Tracking Tables
 * 
 * Creates tables for tracking user operations and their associated costs:
 * - usage_events: Real-time event log of all tracked operations
 * - usage_aggregates: Daily/monthly summaries for efficient querying
 * - usage_limits: Per-user limit enforcement and quota tracking
 * 
 * Features:
 * - Immutable event logs (no updates, only inserts)
 * - Efficient aggregation for reporting
 * - Quota tracking per tier per period
 * - Partition by date for archive/cleanup
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Create usage_events table (immutable event log)
  await knex.schema.createTable('usage_events', (table) => {
    // Identifiers
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();

    // Operation details
    table.string('resource_type').notNullable(); // layouts, exports, ai_calls, uploads, etc.
    table.string('action').notNullable(); // created, deleted, exported, called, etc.
    table.integer('cost').notNullable().defaultTo(1); // Cost in units for this tier

    // Context (immutable snapshot of user state at time of operation)
    table.enu('tier', ['free', 'paid_individual', 'club_admin', 'admin'])
      .notNullable()
      .index(); // Indexed for historical tier analysis

    // Metadata
    table.jsonb('metadata').nullable(); // Additional context: layout_id, export_format, ai_model, etc.
    table.text('description').nullable(); // Human-readable description

    // Timestamps (for archiving and cleanup)
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).index();
    table.timestamp('archived_at').nullable(); // For soft-delete / archiving
  });

  // 2. Create index for efficient querying by user + date range
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_usage_events_user_created 
    ON usage_events(user_id, created_at DESC);
  `);

  // 3. Create index for resource type analysis
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_usage_events_resource_type 
    ON usage_events(resource_type, created_at DESC);
  `);

  // 4. Create usage_aggregates table (materialized summaries)
  await knex.schema.createTable('usage_aggregates', (table) => {
    // Composite primary key (user + period)
    table.uuid('user_id').notNullable();
    table.date('period_start').notNullable(); // Start of period (daily or monthly)
    table.string('period_type').notNullable(); // 'daily' or 'monthly'

    // Primary key
    table.primary(['user_id', 'period_start', 'period_type']);

    // Tier at time of aggregation
    table.enu('tier', ['free', 'paid_individual', 'club_admin', 'admin']).notNullable();

    // Aggregated usage by resource type
    table.integer('layouts_created').notNullable().defaultTo(0);
    table.integer('layouts_deleted').notNullable().defaultTo(0);
    table.integer('exports').notNullable().defaultTo(0);
    table.integer('ai_calls').notNullable().defaultTo(0);
    table.integer('uploads').notNullable().defaultTo(0);

    // Total cost accumulated in period
    table.integer('total_cost').notNullable().defaultTo(0);

    // Tier limits for reference
    table.integer('layout_limit').notNullable().defaultTo(0);
    table.integer('rate_limit_authenticated').notNullable().defaultTo(0);
    table.integer('rate_limit_export').notNullable().defaultTo(0);
    table.integer('rate_limit_ai').notNullable().defaultTo(0);

    // Computed fields
    table.integer('layouts_remaining').nullable(); // limit - (created - deleted)
    table.timestamp('period_reset_at').nullable(); // When limits reset

    // Metadata
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 5. Create index for efficient user lookup
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_usage_aggregates_user 
    ON usage_aggregates(user_id, period_start DESC, period_type);
  `);

  // 6. Create usage_limits table (quota enforcement)
  await knex.schema.createTable('usage_limits', (table) => {
    // Identifiers
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique();

    // Current period tracking
    table.enu('tier', ['free', 'paid_individual', 'club_admin', 'admin']).notNullable();
    table.date('current_period_start').notNullable();
    table.date('period_reset_date').notNullable(); // When limits reset

    // Usage in current period
    table.integer('layouts_used').notNullable().defaultTo(0);
    table.integer('total_cost_used').notNullable().defaultTo(0);

    // Limit overrides (per-user exceptions)
    table.integer('layout_limit_override').nullable(); // NULL = use tier default
    table.integer('rate_limit_override').nullable(); // NULL = use tier default

    // Enforcement flags
    table.boolean('is_rate_limited').notNullable().defaultTo(false);
    table.timestamp('rate_limit_until').nullable();

    // Metadata
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 7. Create index for user lookups
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_usage_limits_user 
    ON usage_limits(user_id);
  `);

  // 8. Add foreign key constraints
  await knex.raw(`
    ALTER TABLE usage_events
    ADD CONSTRAINT fk_usage_events_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  `);

  await knex.raw(`
    ALTER TABLE usage_aggregates
    ADD CONSTRAINT fk_usage_aggregates_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  `);

  await knex.raw(`
    ALTER TABLE usage_limits
    ADD CONSTRAINT fk_usage_limits_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop foreign key constraints
  await knex.raw('ALTER TABLE usage_limits DROP CONSTRAINT fk_usage_limits_user;');
  await knex.raw('ALTER TABLE usage_aggregates DROP CONSTRAINT fk_usage_aggregates_user;');
  await knex.raw('ALTER TABLE usage_events DROP CONSTRAINT fk_usage_events_user;');

  // Drop indexes
  await knex.raw('DROP INDEX IF EXISTS idx_usage_limits_user;');
  await knex.raw('DROP INDEX IF EXISTS idx_usage_aggregates_user;');
  await knex.raw('DROP INDEX IF EXISTS idx_usage_events_resource_type;');
  await knex.raw('DROP INDEX IF EXISTS idx_usage_events_user_created;');

  // Drop tables
  await knex.schema.dropTableIfExists('usage_limits');
  await knex.schema.dropTableIfExists('usage_aggregates');
  await knex.schema.dropTableIfExists('usage_events');
}

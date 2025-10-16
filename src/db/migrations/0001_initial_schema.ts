import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique();
    table.string('name');
    table.enu('role', ['owner', 'admin', 'coach', 'parent']).notNullable().defaultTo('parent');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('clubs', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('slug').notNullable().unique();
    table.string('country', 8);
    table.integer('created_by').unsigned();
    table.timestamps(true, true);
  });

  // Templates table: canonical pitch templates used by seeds and the app
  await knex.schema.createTable('templates', (table) => {
    table.increments('id').primary();
    table.string('template_id').notNullable().unique();
    table.string('name').notNullable();
    table.jsonb('meta');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('user_club_roles', (table) => {
    table.increments('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('club_id').notNullable().references('id').inTable('clubs').onDelete('CASCADE');
    table.enu('role', ['owner', 'admin', 'coach', 'parent']).notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('venues', (table) => {
    table.increments('id').primary();
    table.integer('club_id').unsigned().notNullable().references('id').inTable('clubs').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('address');
    table.specificType('center_point', 'geography(POINT,4326)');
    table.specificType('bbox', 'geography(POLYGON,4326)');
    table.string('tz');
    table.boolean('published').notNullable().defaultTo(false);
    table.string('version_token');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('pitches', (table) => {
    table.increments('id').primary();
    table.integer('venue_id').unsigned().notNullable().references('id').inTable('venues').onDelete('CASCADE');
    table.string('name');
    table.string('code');
    table.string('sport');
    table.string('level');
    table.specificType('geometry', 'geography(POLYGON,4326)');
    table.float('rotation_deg');
    table.string('template_id');
    table.enu('status', ['draft', 'published']).notNullable().defaultTo('draft');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('pitch_segments', (table) => {
    table.increments('id').primary();
    table.integer('pitch_id').unsigned().notNullable().references('id').inTable('pitches').onDelete('CASCADE');
    table.string('name');
    table.string('code');
    table.specificType('geometry', 'geography(POLYGON,4326)');
    table.integer('idx');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('entrances', (table) => {
    table.increments('id').primary();
    table.integer('venue_id').unsigned().notNullable().references('id').inTable('venues').onDelete('CASCADE');
    table.string('name');
    table.specificType('geometry', 'geography(POINT,4326)');
    table.text('notes');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('waypoints', (table) => {
    table.increments('id').primary();
    table.integer('venue_id').unsigned().notNullable().references('id').inTable('venues').onDelete('CASCADE');
    table.string('name');
    table.specificType('geometry', 'geography(POINT,4326)');
    table.string('type');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('sessions', (table) => {
    table.increments('id').primary();
    table.integer('team_id').unsigned();
    table.integer('venue_id').unsigned().notNullable().references('id').inTable('venues').onDelete('CASCADE');
    table.integer('pitch_id').unsigned().references('id').inTable('pitches').onDelete('SET NULL');
    table.integer('segment_id').unsigned().references('id').inTable('pitch_segments').onDelete('SET NULL');
    table.timestamp('start_ts');
    table.timestamp('end_ts');
    table.text('notes');
    table.string('share_token');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('audit_log', (table) => {
    table.increments('id').primary();
    table.string('entity_type');
    table.integer('entity_id');
    table.string('action');
    table.integer('actor_id');
    table.jsonb('before');
    table.jsonb('after');
    table.timestamp('ts').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX IF NOT EXISTS venues_center_point_gist ON venues USING GIST (center_point)');
  await knex.raw('CREATE INDEX IF NOT EXISTS venues_bbox_gist ON venues USING GIST (bbox)');
  await knex.raw('CREATE INDEX IF NOT EXISTS pitches_geometry_gist ON pitches USING GIST (geometry)');
  await knex.raw('CREATE INDEX IF NOT EXISTS pitch_segments_geometry_gist ON pitch_segments USING GIST (geometry)');
  await knex.raw('CREATE INDEX IF NOT EXISTS entrances_geometry_gist ON entrances USING GIST (geometry)');
  await knex.raw('CREATE INDEX IF NOT EXISTS waypoints_geometry_gist ON waypoints USING GIST (geometry)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS waypoints_geometry_gist');
  await knex.raw('DROP INDEX IF EXISTS entrances_geometry_gist');
  await knex.raw('DROP INDEX IF EXISTS pitch_segments_geometry_gist');
  await knex.raw('DROP INDEX IF EXISTS pitches_geometry_gist');
  await knex.raw('DROP INDEX IF EXISTS venues_bbox_gist');
  await knex.raw('DROP INDEX IF EXISTS venues_center_point_gist');

  await knex.schema.dropTableIfExists('audit_log');
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('waypoints');
  await knex.schema.dropTableIfExists('entrances');
  await knex.schema.dropTableIfExists('pitch_segments');
  await knex.schema.dropTableIfExists('pitches');
  await knex.schema.dropTableIfExists('venues');
  await knex.schema.dropTableIfExists('user_club_roles');
  await knex.schema.dropTableIfExists('clubs');
  await knex.schema.dropTableIfExists('users');
}

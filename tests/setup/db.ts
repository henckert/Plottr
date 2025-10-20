/**
 * Jest Global Setup
 * Runs before all tests to set up test database
 * Creates minimal tables needed for integration tests + runs migrations
 */
import { readFile } from 'fs/promises';
import { Pool } from 'pg';
import { execSync } from 'child_process';

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('[Jest] DATABASE_URL not set, skipping global setup');
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Read and execute test schema
    const sqlPath = 'tests/sql/000_test_layouts.sql';
    const sql = await readFile(sqlPath, 'utf8');

    console.log('[Jest] Running global setup: creating test tables...');
    await pool.query(sql);
    console.log('[Jest] Test tables created successfully');
  } catch (error) {
    console.error('[Jest] Global setup failed:', error);
    // Don't throw - tests can handle missing tables or mock them
  } finally {
    await pool.end();
  }

  // Run migrations to ensure all tables exist
  console.log('[Jest] Running database migrations...');
  try {
    execSync('npm run db:migrate', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl }
    });
    console.log('[Jest] ✓ Database migrations completed');
  } catch (error) {
    console.error('[Jest] ✗ Migration failed:', error);
    // Don't throw - continue with tests
  }
}

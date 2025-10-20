/**
 * Jest Global Teardown
 * Runs after all tests to clean up resources
 * Closes DB pools, servers, and background timers to prevent "Jest did not exit" warning
 */

export default async function globalTeardown() {
  // Close Knex database connection pool
  try {
    const { getKnex } = await import('../../src/data/knex');
    const knex = getKnex && getKnex();
    if (knex?.destroy) {
      await knex.destroy();
      console.log('[Jest Teardown] Knex connection pool closed');
    }
  } catch (err) {
    // Silently fail if Knex not initialized
  }

  // Close Express server if stored globally
  try {
    if ((global as any).__SERVER__?.close) {
      await new Promise<void>((resolve) => {
        (global as any).__SERVER__.close(() => {
          console.log('[Jest Teardown] Express server closed');
          resolve();
        });
      });
    }
  } catch (err) {
    // Silently fail if server not running
  }

  // Call any service stop hooks registered globally
  try {
    if ((global as any).__STOP_SERVICES__) {
      await (global as any).__STOP_SERVICES__();
      console.log('[Jest Teardown] Services stopped');
    }
  } catch (err) {
    // Silently fail if no services registered
  }

  console.log('[Jest] Global teardown complete');
}

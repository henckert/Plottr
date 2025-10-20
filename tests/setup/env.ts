/**
 * Jest Setup - Environment Variables
 * Loads test environment variables before tests run
 */

// Ensure test database is used
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL_TEST || 'postgres://postgres:postgres@localhost:5432/plottr_test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

// Disable auth requirements for tests
process.env.AUTH_REQUIRED = 'false';

// Optional: Mock external services
process.env.MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || 'test-mapbox-token';

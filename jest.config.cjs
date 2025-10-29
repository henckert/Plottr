module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  maxWorkers: 1,
  globalSetup: '<rootDir>/tests/setup/db.ts',
  globalTeardown: '<rootDir>/tests/setup/teardown.ts',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  setupFiles: ['<rootDir>/tests/setup/env.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.mapbox.mock.js',
    '<rootDir>/tests/setup/after-env.ts'
  ]
};

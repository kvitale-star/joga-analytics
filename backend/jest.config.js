export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/db/migrate.ts',
    '!src/scripts/**',
  ],
  testTimeout: 10000, // Reduced timeout since rate limiting is disabled in tests
  setupFiles: ['<rootDir>/src/__tests__/load-env.ts'], // Load .env BEFORE test files load
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'], // Run AFTER test files load (for migrations, cleanup)
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  forceExit: true, // Force Jest to exit after tests complete (prevents hanging)
  detectOpenHandles: true, // Detect open handles that might prevent Jest from exiting
};

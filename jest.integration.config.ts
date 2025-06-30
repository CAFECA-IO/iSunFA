/** Info: (20250630 - Shirley)
 * Jest configuration specifically for integration tests
 * Optimized for server resource management and test stability
 */
import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  // Info: (20250630 - Shirley) Use descriptive display name
  displayName: 'Integration Tests',

  // Info: (20250630 - Shirley) Clear mocks between tests
  clearMocks: true,

  // Info: (20250630 - Shirley) Test environment
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },

  // Info: (20250630 - Shirley) Module name mapping
  moduleNameMapper: {
    '^@/client$': '<rootDir>/prisma/client.ts',
    '^@package$': '<rootDir>/package.json',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Info: (20250630 - Shirley) Transform configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!@passwordless-id/webauthn)'],

  // Info: (20250630 - Shirley) Test file patterns - only integration tests (explicit order)
  testMatch: [
    '<rootDir>/src/tests/integration/test_cases/00_*.test.ts',
    '<rootDir>/src/tests/integration/test_cases/01_*.test.ts',
    '<rootDir>/src/tests/integration/test_cases/02_*.test.ts',
    '<rootDir>/src/tests/integration/**/*.test.ts',
    '<rootDir>/src/tests/integration/**/*.test.tsx',
  ],

  // Info: (20250630 - Shirley) Setup files
  // setupFilesAfterEnv: ['<rootDir>/src/tests/integration/test_setup.ts'],

  // Info: (20250630 - Shirley) Global setup and teardown for shared server
  globalSetup: '<rootDir>/src/tests/integration/global_setup.ts',
  globalTeardown: '<rootDir>/src/tests/integration/global_teardown.ts',

  // Info: (20250630 - Shirley) Resource management optimizations
  maxWorkers: 1, // Force serial execution to avoid server conflicts
  testTimeout: process.env.CI ? 180000 : 120000, // 3 minutes for CI, 2 minutes locally

  // Info: (20250630 - Shirley) Disable coverage for integration tests (focus on functionality)
  collectCoverage: false,

  // Info: (20250630 - Shirley) Longer timeouts for server operations
  slowTestThreshold: 30, // 30 seconds before marking as slow

  // Info: (20250630 - Shirley) Verbose output only in debug mode
  verbose: process.env.DEBUG_TESTS === 'true',

  // Info: (20250630 - Shirley) Don't exit on first test failure - run all tests to get full picture
  bail: false,

  // Info: (20250630 - Shirley) Force Jest to exit when tests complete
  forceExit: true,

  // Info: (20250630 - Shirley) Detect open handles to prevent hanging
  detectOpenHandles: true,

  // Info: (20250630 - Shirley) Jest doesn't have a retry option by default
  // retry: 1,

  // Info: (20250630 - Shirley) Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-integration',

  // Info: (20250630 - Shirley) Error handling
  errorOnDeprecated: false, // Info: (20250630 - Shirley) Don't fail on deprecated APIs during tests

  // Info: (20250630 - Shirley) Test result reporting - use default reporter for now
  reporters: ['default'],
};

export default createJestConfig(config);

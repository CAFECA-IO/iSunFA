/**
 * Jest configuration specifically for integration tests
 * Optimized for server resource management and test stability
 */
import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  // Use descriptive display name
  displayName: 'Integration Tests',

  // Clear mocks between tests
  clearMocks: true,

  // Test environment
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },

  // Module name mapping
  moduleNameMapper: {
    '^@/client$': '<rootDir>/prisma/client.ts',
    '^@package$': '<rootDir>/package.json',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!@passwordless-id/webauthn)'],

  // Test file patterns - only integration tests (explicit order)
  testMatch: [
    '<rootDir>/src/tests/integration/test_cases/00_*.test.ts',
    '<rootDir>/src/tests/integration/test_cases/01_*.test.ts',
    '<rootDir>/src/tests/integration/test_cases/02_*.test.ts',
    '<rootDir>/src/tests/integration/**/*.test.ts',
    '<rootDir>/src/tests/integration/**/*.test.tsx',
  ],

  // Setup files
  // setupFilesAfterEnv: ['<rootDir>/src/tests/integration/test_setup.ts'],

  // Global setup and teardown for shared server
  globalSetup: '<rootDir>/src/tests/integration/global_setup.ts',
  globalTeardown: '<rootDir>/src/tests/integration/global_teardown.ts',

  // Resource management optimizations
  maxWorkers: 1, // Force serial execution to avoid server conflicts
  testTimeout: process.env.CI ? 180000 : 120000, // 3 minutes for CI, 2 minutes locally

  // Disable coverage for integration tests (focus on functionality)
  collectCoverage: false,

  // Longer timeouts for server operations
  slowTestThreshold: 30, // 30 seconds before marking as slow

  // Verbose output only in debug mode
  verbose: process.env.DEBUG_TESTS === 'true',

  // Don't exit on first test failure - run all tests to get full picture
  bail: false,

  // Force Jest to exit when tests complete
  forceExit: true,

  // Detect open handles to prevent hanging
  detectOpenHandles: true,

  // Jest doesn't have a retry option by default
  // retry: 1,

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-integration',

  // Error handling
  errorOnDeprecated: false, // Don't fail on deprecated APIs during tests

  // Test result reporting - use default reporter for now
  reporters: ['default'],
};

export default createJestConfig(config);

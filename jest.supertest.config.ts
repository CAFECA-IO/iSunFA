// Info: (20250701 - Shirley) Jest configuration for supertest-based integration tests
import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  // Info: (20250701 - Shirley) Test environment configuration
  testEnvironment: 'node',

  // Info: (20250701 - Shirley) Test file patterns for integration tests
  testMatch: ['<rootDir>/src/tests/integration/test_cases/**/*.test.ts'],

  // Info: (20250701 - Shirley) Setup files
  setupFilesAfterEnv: ['<rootDir>/src/tests/integration/setup/jest_setup.ts'],

  // Info: (20250701 - Shirley) Module path mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@package$': '<rootDir>/package.json',
  },

  // Info: (20250701 - Shirley) Transform configuration
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  // Info: (20250701 - Shirley) Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Info: (20250701 - Shirley) Test execution configuration
  maxWorkers: 1, // Info: (20250701 - Shirley) Run tests serially to avoid database conflicts
  testTimeout: 30000, // Info: (20250701 - Shirley) 30 second timeout for integration tests

  // Info: (20250701 - Shirley) Coverage configuration (disabled for integration tests)
  collectCoverage: false,

  // Info: (20250701 - Shirley) Verbose output for debugging
  verbose: true,

  // Info: (20250701 - Shirley) Display name for this test configuration
  displayName: {
    name: 'Integration Tests (Supertest)',
    color: 'blue',
  },

  // Info: (20250701 - Shirley) Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Info: (20250701 - Shirley) Environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },

  // Info: (20250630 - Shirley) A path to a module which exports an async function that is triggered once before all test suites
  globalSetup: '<rootDir>/src/tests/integration/setup/global_setup.ts',

  // Info: (20250630 - Shirley) A path to a module which exports an async function that is triggered once after all test suites
  globalTeardown: '<rootDir>/src/tests/integration/setup/global_teardown.ts',
};

export default createJestConfig(config);

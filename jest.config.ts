/** Info: (20250630 - Shirley)
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */
import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  // Info: (20250630 - Shirley) Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});
const config: Config = {
  // Info: (20250630 - Shirley) All imported modules in your tests should be mocked automatically
  // automock: false,

  // Info: (20250630 - Shirley) Stop running tests after `n` failures
  // bail: 0,

  // Info: (20250630 - Shirley) The directory where Jest should store its cached dependency information
  // cacheDirectory: "/private/var/folders/s9/ybzwh53178562g6r6k8kcbgr0000gn/T/jest_dx",

  // Info: (20250630 - Shirley) Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Info: (20250630 - Shirley) Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // Info: (20250630 - Shirley) An array of glob patterns indicating a set of files for which coverage information should be collected
  // collectCoverageFrom: undefined,

  // Info: (20250630 - Shirley) The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // Info: (20250630 - Shirley) An array of regexp pattern strings used to skip coverage collection
  // coveragePathIgnorePatterns: [
  //   "/node_modules/"
  // ],

  // Info: (20250630 - Shirley) Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'babel',

  // Info: (20250630 - Shirley) A list of reporter names that Jest uses when writing coverage reports
  // coverageReporters: [
  //   "json",
  //   "text",
  //   "lcov",
  //   "clover"
  // ],

  // Info: (20250630 - Shirley) An object that configures minimum threshold enforcement for coverage results
  // coverageThreshold: undefined,

  // Info: (20250630 - Shirley) A path to a custom dependency extractor
  // dependencyExtractor: undefined,

  // Info: (20250630 - Shirley) Make calling deprecated APIs throw helpful error messages
  // errorOnDeprecated: false,

  // Info: (20250630 - Shirley) The default configuration for fake timers
  // fakeTimers: {
  //   "enableGlobally": false
  // },

  // Info: (20250630 - Shirley) Force coverage collection from ignored files using an array of glob patterns
  // forceCoverageMatch: [],

  // Info: (20250630 - Shirley) A path to a module which exports an async function that is triggered once before all test suites
  // globalSetup: undefined,

  // Info: (20250630 - Shirley) A path to a module which exports an async function that is triggered once after all test suites
  // globalTeardown: undefined,

  // Info: (20250630 - Shirley) A set of global variables that need to be available in all test environments
  // globals: {},

  // Info: (20250630 - Shirley) The maximum amount of workers used to run your tests. Can be specified as % or a number. E.g. maxWorkers: 10% will use 10% of your CPU amount + 1 as the maximum worker number. maxWorkers: 2 will use a maximum of 2 workers.
  // Info: (20250630 - Shirley) For integration tests, limit to 1 worker to avoid server resource conflicts
  maxWorkers: process.env.TEST_TYPE === 'integration' ? 1 : '50%',

  // Info: (20250630 - Shirley) An array of directory names to be searched recursively up from the requiring module's location
  // moduleDirectories: [
  //   "node_modules"
  // ],

  // Info: (20250630 - Shirley) An array of file extensions your modules use
  // moduleFileExtensions: [
  //   "js",
  //   "mjs",
  //   "cjs",
  //   "jsx",
  //   "ts",
  //   "tsx",
  //   "json",
  //   "node"
  // ],

  // Info: (20250630 - Shirley) A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^@/client$': '<rootDir>/prisma/client.ts',
    '^@package$': '<rootDir>/package.json',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Info: (20250630 - Shirley) An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
  // modulePathIgnorePatterns: [],

  // Info: (20250630 - Shirley) Activates notifications for test results
  // notify: false,

  // Info: (20250630 - Shirley) An enum that specifies notification mode. Requires { notify: true }
  // notifyMode: "failure-change",

  // Info: (20250630 - Shirley) A preset that is used as a base for Jest's configuration
  // preset: undefined,

  // Info: (20250630 - Shirley) Run tests from one or more projects
  // projects: undefined,

  // Info: (20250630 - Shirley) Use this configuration option to add custom reporters to Jest
  // reporters: undefined,

  // Info: (20250630 - Shirley) Automatically reset mock state before every test
  // resetMocks: false,

  // Info: (20250630 - Shirley) Reset the module registry before running each individual test
  // resetModules: false,

  // Info: (20250630 - Shirley) A path to a custom resolver
  // resolver: undefined,

  // Info: (20250630 - Shirley) Automatically restore mock state and implementation before every test
  // restoreMocks: false,

  // Info: (20250630 - Shirley) The root directory that Jest should scan for tests and modules within
  // rootDir: undefined,

  // Info: (20250630 - Shirley) A list of paths to directories that Jest should use to search for files in
  // roots: [
  //   "<rootDir>"
  // ],

  // Info: (20250630 - Shirley) Allows you to use a custom runner instead of Jest's default test runner
  // runner: "jest-runner",

  // Info: (20250630 - Shirley) The paths to modules that run some code to configure or set up the testing environment before each test
  // setupFiles: [],

  // Info: (20250630 - Shirley) A list of paths to modules that run some code to configure or set up the testing framework before each test
  // setupFilesAfterEnv: ['<rootDir>/src/tests/utils/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/integration/setup/jest_setup.ts'],

  // Info: (20250630 - Shirley) The number of seconds after which a test is considered as slow and reported as such in the results.
  // slowTestThreshold: 5,

  // Info: (20250630 - Shirley) Test timeout - longer for integration tests and CI environment
  testTimeout: process.env.TEST_TYPE === 'integration' ? 120000 : process.env.CI ? 15000 : 5000, // 15 seconds for CI, 5 seconds for unit tests locally

  // Info: (20250630 - Shirley) Force Jest to exit when tests complete to prevent hanging
  forceExit: true,

  // Info: (20250630 - Shirley) Detect open handles to prevent hanging
  detectOpenHandles: true,

  // Info: (20250630 - Shirley) A list of paths to snapshot serializer modules Jest should use for snapshot testing
  // snapshotSerializers: [],

  // Info: (20250630 - Shirley) The test environment that will be used for testing
  testEnvironment: 'node',

  // Info: (20250630 - Shirley) Node options for running tests
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },

  // Info: (20250630 - Shirley) Options that will be passed to the testEnvironment
  // testEnvironmentOptions: {},

  // Info: (20250630 - Shirley) Adds a location field to test results
  // testLocationInResults: false,

  // Info: (20250630 - Shirley) The glob patterns Jest uses to detect test files
  // testMatch: [
  //   "**/__tests__/**/*.[jt]s?(x)",
  //   "**/?(*.)+(spec|test).[tj]s?(x)"
  // ],

  // Info: (20250630 - Shirley) An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/tests/integration/', // Exclude integration tests from regular test runs
  ],

  // Info: (20250630 - Shirley) The regexp pattern or array of patterns that Jest uses to detect test files
  // testRegex: [],

  // Info: (20250630 - Shirley) This option allows the use of a custom results processor
  // testResultsProcessor: undefined,

  // Info: (20250630 - Shirley) This option allows use of a custom test runner
  // testRunner: "jest-circus/runner",

  // Info: (20250630 - Shirley) A map from regular expressions to paths to transformers
  // transform: undefined,
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // Info: (20250630 - Shirley) An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  // transformIgnorePatterns: [
  //   "/node_modules/",
  //   "\\.pnp\\.[^\\/]+$"
  // ],
  transformIgnorePatterns: ['/node_modules/(?!@passwordless-id/webauthn)'],

  // Info: (20250630 - Shirley) An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
  // unmockedModulePathPatterns: undefined,

  // Info: (20250630 - Shirley) Indicates whether each individual test should be reported during the run
  // verbose: undefined,

  // Info: (20250630 - Shirley) An array of regexp patterns that are matched against all source file paths before re-running tests in watch mode
  // watchPathIgnorePatterns: [],

  // Info: (20250630 - Shirley) Whether to use watchman for file crawling
  // watchman: true,
};

export default createJestConfig(config);

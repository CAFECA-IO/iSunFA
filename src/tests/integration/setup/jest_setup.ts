/** Info: (20250703 - Shirley)
 * Integration Test Jest Setup Configuration
 *
 * Provides Jest configuration and global setup for integration tests using supertest.
 * Manages test environment variables, server lifecycle, and test timeout settings.
 *
 * Purpose:
 * - Configure Jest environment for integration testing
 * - Set up test environment variables
 * - Manage test server lifecycle and cleanup
 * - Configure test timeouts for API calls
 *
 * Usage:
 * // This file is automatically loaded by Jest through setupFilesAfterEnv
 * // No direct import required in test files
 *
 * // Environment variables set:
 * // - INTEGRATION_TEST: 'true'
 * // - TEST_TYPE: 'integration'
 * // - DEBUG_API: 'true' (if DEBUG_TESTS is enabled)
 */
import { closeAllTestServers } from '@/tests/integration/setup/test_client';

beforeAll(async () => {
  process.env.INTEGRATION_TEST = 'true';
  process.env.TEST_TYPE = 'integration';

  if (process.env.DEBUG_TESTS === 'true') {
    process.env.DEBUG_API = 'true';
  }
});

afterAll(async () => {
  await closeAllTestServers();
  delete process.env.DEBUG_API;
});

beforeEach(() => {
  // Info: (20250701 - Shirley) Clear any test-specific environment variables if needed
});

// Info: (20250703 - Shirley) Don't close servers after each test since they're reused across tests in beforeAll
// afterEach(async () => {
//   await closeAllTestServers();
// });

// Info: (20250701 - Shirley) Extend Jest timeout for integration tests
jest.setTimeout(30000);

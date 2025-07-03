// Info: (20250701 - Shirley) Jest setup for supertest-based integration tests
// Info: (20250701 - Shirley) Focus on API testing without direct database manipulation

import { closeAllTestServers } from '@/tests/integration/test_client';

// Info: (20250701 - Shirley) Setup before all tests
beforeAll(async () => {
  // Info: (20250701 - Shirley) Set test environment variables
  process.env.INTEGRATION_TEST = 'true';
  process.env.TEST_TYPE = 'integration';

  // Info: (20250701 - Shirley) Enable debug mode if needed
  if (process.env.DEBUG_TESTS === 'true') {
    process.env.DEBUG_API = 'true';
  }
});

// Info: (20250701 - Shirley) Cleanup after all tests
afterAll(async () => {
  // Info: (20250703 - Shirley) Close all test servers to prevent connection reset errors
  await closeAllTestServers();

  // Info: (20250701 - Shirley) Clean up environment variables
  delete process.env.DEBUG_API;
});

// Info: (20250701 - Shirley) Setup before each test - no database cleanup needed
// Info: (20250701 - Shirley) Tests use system default values and simulate real user behavior
beforeEach(() => {
  // Info: (20250701 - Shirley) Clear any test-specific environment variables if needed
});

// Info: (20250703 - Shirley) Don't close servers after each test since they're reused across tests in beforeAll
// afterEach(async () => {
//   // Info: (20250703 - Shirley) Close test servers after each test
//   await closeAllTestServers();
// });

// Info: (20250701 - Shirley) Extend Jest timeout for integration tests
jest.setTimeout(30000);

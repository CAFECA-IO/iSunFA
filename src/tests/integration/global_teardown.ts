import { SharedTestServer } from '@/tests/integration/shared_server';

/** Info: (20250630 - Shirley)
 * Global teardown for integration tests
 * This runs once after all tests complete
 */
export default async function globalTeardown(): Promise<void> {
  // Info: (20250701 - Shirley) Only log when debugging is enabled
  if (process.env.DEBUG_TESTS === 'true') {
    // eslint-disable-next-line no-console
    console.log('🧹 Cleaning up global test environment...');
  }

  try {
    // Info: (20250630 - Shirley) Clean up the shared test server
    await SharedTestServer.cleanup();
    // Info: (20250701 - Shirley) Only log when debugging is enabled
    if (process.env.DEBUG_TESTS === 'true') {
      // eslint-disable-next-line no-console
      console.log('✅ Global test environment cleaned up');
    }
  } catch (error) {
    // Info: (20250701 - Shirley) Only log when debugging is enabled
    if (process.env.DEBUG_TESTS === 'true') {
      // eslint-disable-next-line no-console
      console.error('❌ Failed to cleanup global test environment:', error);
    }
    // Info: (20250630 - Shirley) Don't throw here to avoid masking test failures
  }
}

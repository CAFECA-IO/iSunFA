import { SharedTestServer } from '@/tests/integration/shared_server';
import { testLoggers } from '@/tests/integration/utils/test_logger';

/** Info: (20250630 - Shirley)
 * Global teardown for integration tests
 * This runs once after all tests complete
 */
export default async function globalTeardown(): Promise<void> {
  testLoggers.teardown.info('🧹 Cleaning up global test environment...');

  try {
    // Info: (20250630 - Shirley) Clean up the shared test server
    await SharedTestServer.cleanup();
    testLoggers.teardown.info('✅ Global test environment cleaned up');
  } catch (error) {
    testLoggers.teardown.error('❌ Failed to cleanup global test environment:', error);
    // Info: (20250630 - Shirley) Don't throw here to avoid masking test failures
  }
}

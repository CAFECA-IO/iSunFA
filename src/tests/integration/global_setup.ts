import { SharedTestServer } from '@/tests/integration/shared_server';
import { testLoggers } from '@/tests/integration/utils/test_logger';

/** Info: (20250630 - Shirley)
 * Global setup for integration tests
 * This runs once before all tests start
 */
export default async function globalSetup(): Promise<void> {
  testLoggers.setup.info('🔧 Setting up global test environment...');

  try {
    // Info: (20250630 - Shirley) Start the shared test server
    await SharedTestServer.getInstance();
    testLoggers.setup.info('✅ Global test environment ready');
  } catch (error) {
    testLoggers.setup.error('❌ Failed to setup global test environment:', error);
    throw error;
  }
}

import { SharedTestServer } from '@/tests/integration/shared_server';

/** Info: (20250630 - Shirley)
 * Global setup for integration tests
 * This runs once before all tests start
 */
export default async function globalSetup(): Promise<void> {
  // Info: (20250701 - Shirley) Only log when debugging is enabled
  if (process.env.DEBUG_TESTS === 'true') {
    // eslint-disable-next-line no-console
    console.log('🔧 Setting up global test environment...');
  }

  try {
    // Info: (20250630 - Shirley) Start the shared test server
    await SharedTestServer.getInstance();
    // Info: (20250701 - Shirley) Only log when debugging is enabled
    if (process.env.DEBUG_TESTS === 'true') {
      // eslint-disable-next-line no-console
      console.log('✅ Global test environment ready');
    }
  } catch (error) {
    // Info: (20250701 - Shirley) Only log when debugging is enabled
    if (process.env.DEBUG_TESTS === 'true') {
      // eslint-disable-next-line no-console
      console.error('❌ Failed to setup global test environment:', error);
    }
    throw error;
  }
}

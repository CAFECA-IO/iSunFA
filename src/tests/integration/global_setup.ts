import { SharedTestServer } from '@/tests/shared_server';

/** Info: (20250630 - Shirley)
 * Global setup for integration tests
 * This runs once before all tests start
 */
export default async function globalSetup(): Promise<void> {
  // Deprecated: (20250630 - Luphia) remove eslint-disable
  // eslint-disable-next-line no-console
  console.log('🔧 Setting up global test environment...');

  try {
    // Info: (20250630 - Shirley) Start the shared test server
    await SharedTestServer.getInstance();
    // Deprecated: (20250630 - Luphia) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log('✅ Global test environment ready');
  } catch (error) {
    // Deprecated: (20250630 - Luphia) remove eslint-disable
    // eslint-disable-next-line no-console
    console.error('❌ Failed to setup global test environment:', error);
    throw error;
  }
}

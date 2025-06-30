import { SharedTestServer } from './shared_server';

/**
 * Global setup for integration tests
 * This runs once before all tests start
 */
export default async function globalSetup(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🔧 Setting up global test environment...');

  try {
    // Start the shared test server
    await SharedTestServer.getInstance();

    // eslint-disable-next-line no-console
    console.log('✅ Global test environment ready');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to setup global test environment:', error);
    throw error;
  }
}

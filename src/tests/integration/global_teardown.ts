import { SharedTestServer } from './shared_server';

/**
 * Global teardown for integration tests
 * This runs once after all tests complete
 */
export default async function globalTeardown(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🧹 Cleaning up global test environment...');

  try {
    // Clean up the shared test server
    await SharedTestServer.cleanup();

    // eslint-disable-next-line no-console
    console.log('✅ Global test environment cleaned up');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to cleanup global test environment:', error);
    // Don't throw here to avoid masking test failures
  }
}

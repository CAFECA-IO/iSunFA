import { SharedTestServer } from './shared-server';

/**
 * Test setup that runs before each test file
 * Uses the shared server instance instead of creating new ones
 */

// Global shared server instance
let sharedServer: SharedTestServer;

/**
 * Setup function that each test can use
 */
export async function setupIntegrationTest(): Promise<SharedTestServer> {
  if (!sharedServer) {
    sharedServer = await SharedTestServer.getInstance();
  }

  // Clean test state between tests
  await sharedServer.cleanTestState();

  return sharedServer;
}

/**
 * Helper function to get test credentials
 */
export function getTestCredentials(): { email: string; code: string } {
  return {
    email: 'user@isunfa.com', // Default test email
    code: '555666', // Default test code
  };
}

/**
 * Helper function to get base URL
 */
export function getBaseUrl(): string {
  if (!sharedServer) {
    throw new Error('Shared server not initialized. Call setupIntegrationTest() first.');
  }
  return sharedServer.getBaseUrl();
}

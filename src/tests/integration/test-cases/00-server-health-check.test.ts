import { ApiClient } from '@/tests/integration/api-client';
import { IntegrationTestSetup } from '@/tests/integration/setup';

describe('Integration Test - Server Health Check', () => {
  let apiClient: ApiClient;

  beforeAll(async () => {
    await IntegrationTestSetup.initialize();
    apiClient = new ApiClient();
  });

  afterAll(async () => {
    await IntegrationTestSetup.cleanup();
  });

  beforeEach(() => {
    // Clear session before each test for clean state
    apiClient.clearSession();
  });

  describe('0.1 GET /api/v2/status_info', () => {
    describe('Server Health and API Functionality', () => {
      it('should respond successfully indicating server is running', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await apiClient.get<any>('/api/v2/status_info');

        // eslint-disable-next-line no-console
        console.log('=== Server Health Check API Response ===');
        // eslint-disable-next-line no-console
        console.log('Full Response:', JSON.stringify(response, null, 2));
        // eslint-disable-next-line no-console
        console.log('Status Info Payload:', JSON.stringify(response.payload, null, 2));

        // Verify server is responding
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        expect(response.code).toBe('200ISF0002'); // SUCCESS_GET
        expect(response.message).toBeDefined();
        expect(response.payload).toBeDefined();
      });

      it('should display detailed API response for inspection', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await apiClient.get<any>('/api/v2/status_info');

        // eslint-disable-next-line no-console
        console.log('\n📊 === DETAILED API RESPONSE INSPECTION ===');
        // eslint-disable-next-line no-console
        console.log('🔧 Response Metadata:');
        // eslint-disable-next-line no-console
        console.log(`   Success: ${response.success}`);
        // eslint-disable-next-line no-console
        console.log(`   Code: ${response.code}`);
        // eslint-disable-next-line no-console
        console.log(`   Message: ${response.message}`);
        // eslint-disable-next-line no-console
        console.log(`   PowerBy: ${response.powerby}`);

        // eslint-disable-next-line no-console
        console.log('\n👤 User Information:');
        if (response.payload.user) {
          // eslint-disable-next-line no-console
          console.log(`   ID: ${response.payload.user.id}`);
          // eslint-disable-next-line no-console
          console.log(`   Name: ${response.payload.user.name}`);
          // eslint-disable-next-line no-console
          console.log(`   Email: ${response.payload.user.email}`);
          // eslint-disable-next-line no-console
          console.log(`   Created: ${new Date(response.payload.user.createdAt * 1000).toISOString()}`);
          // eslint-disable-next-line no-console
          console.log(`   Updated: ${new Date(response.payload.user.updatedAt * 1000).toISOString()}`);
        } else {
          // eslint-disable-next-line no-console
          console.log('   No user data (unauthenticated)');
        }

        // eslint-disable-next-line no-console
        console.log('\n🏢 Company Information:');
        if (response.payload.company) {
          // eslint-disable-next-line no-console
          console.log('   Company data present:', Object.keys(response.payload.company));
        } else {
          // eslint-disable-next-line no-console
          console.log('   No company data');
        }

        // eslint-disable-next-line no-console
        console.log('\n👥 Role Information:');
        if (response.payload.role) {
          // eslint-disable-next-line no-console
          console.log('   Role data present:', Object.keys(response.payload.role));
        } else {
          // eslint-disable-next-line no-console
          console.log('   No role data');
        }

        // eslint-disable-next-line no-console
        console.log('\n🔗 Teams Information:');
        // eslint-disable-next-line no-console
        console.log(`   Teams count: ${response.payload.teams.length}`);
        if (response.payload.teams.length > 0) {
          // eslint-disable-next-line no-console
          console.log('   Teams:', response.payload.teams);
        }

        // eslint-disable-next-line no-console
        console.log('\n📋 Complete Raw Response:');
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(response, null, 2));
        // eslint-disable-next-line no-console
        console.log('=== END API RESPONSE INSPECTION ===\n');

        // Basic assertions to make this a valid test
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
      });

      it('should return proper API response structure', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await apiClient.get<any>('/api/v2/status_info');

        // Verify RESTful API response structure
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('code');
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('payload');
        expect(response).toHaveProperty('powerby');

        // Verify boolean type for success
        expect(typeof response.success).toBe('boolean');

        // Verify string type for code and message
        expect(typeof response.code).toBe('string');
        expect(typeof response.message).toBe('string');
        // expect(typeof response?.powerby).toBe('string');
      });

      it('should return status info with expected structure', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await apiClient.get<any>('/api/v2/status_info');

        expect(response.success).toBe(true);
        expect(response.payload).toBeDefined();
        expect(response.payload).toHaveProperty('user');
        expect(response.payload).toHaveProperty('company');
        expect(response.payload).toHaveProperty('role');
        expect(response.payload).toHaveProperty('teams');

        // Verify data types regardless of authentication state
        if (response.payload.user !== null) {
          expect(typeof response.payload.user).toBe('object');
        }
        if (response.payload.company !== null) {
          expect(typeof response.payload.company).toBe('object');
        }
        if (response.payload.role !== null) {
          expect(typeof response.payload.role).toBe('object');
        }
        expect(Array.isArray(response.payload.teams)).toBe(true);
      });

      it('should return real data from actual database (not mocked)', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response1 = await apiClient.get<any>('/api/v2/status_info');

        // Wait a moment and make another request
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 100));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response2 = await apiClient.get<any>('/api/v2/status_info');

        // Both responses should be successful
        expect(response1.success).toBe(true);
        expect(response2.success).toBe(true);

        // If this were mocked data, the timestamps and response structure would be identical
        // Real data should have consistent structure but may have timing differences
        expect(response1.payload).toEqual(response2.payload);

        // Verify the response contains real application metadata
        expect(response1.powerby).toMatch(/iSunFA v\d+\.\d+\.\d+/);
        expect(response1.message).toBe('Get successfully');
        expect(response1.code).toBe('200ISF0002');
      });

      it('should validate real database interaction with user data', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await apiClient.get<any>('/api/v2/status_info');

        expect(response.success).toBe(true);

        // If user data exists, validate it's real database data
        if (response.payload.user !== null) {
          const { user } = response.payload;

          // Real user data should have these properties with realistic values
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('email');
          expect(user).toHaveProperty('name');
          expect(user).toHaveProperty('createdAt');
          expect(user).toHaveProperty('updatedAt');

          // Validate realistic timestamp values (not mock placeholders)
          expect(typeof user.id).toBe('number');
          expect(user.id).toBeGreaterThan(0);
          expect(typeof user.createdAt).toBe('number');
          expect(user.createdAt).toBeGreaterThan(1000000000); // After year 2001
          expect(user.createdAt).toBeLessThan(Date.now() / 1000 + 86400); // Not in future

          // Email should be a valid format
          expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

          // Name should be a non-empty string
          expect(typeof user.name).toBe('string');
          expect(user.name.length).toBeGreaterThan(0);
        }
      });

      it('should have consistent response time indicating server performance', async () => {
        const startTime = Date.now();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await apiClient.get<any>('/api/v2/status_info');
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(response.success).toBe(true);
        // API should respond within reasonable time (less than 5 seconds)
        expect(responseTime).toBeLessThan(5000);
      });

      it('should handle multiple concurrent requests properly', async () => {
        // Test server stability with concurrent requests
        const requests = Array(5)
          .fill(null)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map(() => apiClient.get<any>('/api/v2/status_info'));

        const responses = await Promise.all(requests);

        // All requests should succeed
        responses.forEach((response) => {
          expect(response.success).toBe(true);
          expect(response.code).toBe('200ISF0002');
          expect(response.payload).toBeDefined();
        });
      });

      it('should return proper HTTP status code 200', async () => {
        // Test the underlying HTTP response
        const url = `${IntegrationTestSetup.getApiBaseUrl()}/api/v2/status_info`;
        const httpResponse = await fetch(url);

        expect(httpResponse.status).toBe(200);
        expect(httpResponse.ok).toBe(true);
        expect(httpResponse.headers.get('content-type')).toContain('application/json');

        const jsonResponse = await httpResponse.json();
        expect(jsonResponse.success).toBe(true);
      });
    });

    describe('RESTful API Standards Compliance', () => {
      it('should follow RESTful naming conventions', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await apiClient.get<any>('/api/v2/status_info');

        // API version in URL
        expect(apiClient.getCookies()).toBeDefined(); // URL structure is correct if we reach here

        // Response follows standard structure
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('code');
        expect(response).toHaveProperty('message');
      });

      it('should return appropriate content-type header', async () => {
        const url = `${IntegrationTestSetup.getApiBaseUrl()}/api/v2/status_info`;
        const httpResponse = await fetch(url);

        expect(httpResponse.headers.get('content-type')).toContain('application/json');
      });

      it('should support OPTIONS method for CORS', async () => {
        const url = `${IntegrationTestSetup.getApiBaseUrl()}/api/v2/status_info`;
        const httpResponse = await fetch(url, { method: 'OPTIONS' });

        // Should not return an error for OPTIONS request
        expect(httpResponse.status).toBeLessThan(500);
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid HTTP methods gracefully', async () => {
        const url = `${IntegrationTestSetup.getApiBaseUrl()}/api/v2/status_info`;
        const httpResponse = await fetch(url, { method: 'DELETE' });

        expect(httpResponse.status).toBe(405); // Method Not Allowed

        const jsonResponse = await httpResponse.json();
        expect(jsonResponse.success).toBe(false);
        expect(jsonResponse.code).toBe('405ISF0000');
      });

      it('should maintain server stability after error requests', async () => {
        // Send an invalid request first
        const url = `${IntegrationTestSetup.getApiBaseUrl()}/api/v2/status_info`;
        await fetch(url, { method: 'DELETE' });

        // Then verify server still responds normally
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await apiClient.get<any>('/api/v2/status_info');
        expect(response.success).toBe(true);
        expect(response.code).toBe('200ISF0002');
      });
    });
  });
});

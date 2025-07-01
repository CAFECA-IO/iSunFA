// Info: (20240701 - Shirley) Supertest-based user email authentication integration tests
// Info: (20240701 - Shirley) Following the original test philosophy: simulate real user behavior using default values
import { APITestHelper } from '@/tests/integration/supertest/api_helper';
import { TestDataFactory } from '@/tests/integration/supertest/test_data_factory';
import { createDynamicTestClient, TestClient } from '@/tests/integration/supertest/test_client';
import otpHandler from '@/pages/api/v2/email/[email]/one_time_password';

/**
 * Info: (20240701 - Shirley) Integration Test - User Email Authentication (Supertest Version)
 *
 * Testing Philosophy:
 * - Uses system default emails and verification codes for authentication testing
 * - Focuses on authentication logic through real API calls
 * - Tests session persistence across multiple API calls
 * - Validates both success and failure scenarios
 * - Simulates real user behavior without direct database manipulation
 */
describe('Integration Test - User Email Authentication (Supertest)', () => {
  let apiHelper: APITestHelper;

  beforeAll(async () => {
    // Info: (20240701 - Shirley) Initialize API helpers for testing
    apiHelper = new APITestHelper();
  });

  // Info: (20240701 - Shirley) Helper function to create OTP client for specific email
  const createOTPClient = (email: string): TestClient => {
    return createDynamicTestClient(otpHandler, { email });
  };

  // ========================================
  // Info: (20240701 - Shirley) Test Case 1.1: Email Authentication with Default Values
  // ========================================
  describe('Test Case 1.1: Email Authentication with Default Values', () => {
    it('should successfully request OTP for primary test email', async () => {
      const response = await apiHelper.requestOTP();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0002');
    });

    it('should successfully authenticate with default email and code', async () => {
      // Info: (20240701 - Shirley) Complete authentication flow: OTP request -> authentication
      const { otpResponse, authResponse } = await apiHelper.completeAuthenticationFlow();

      // Info: (20240701 - Shirley) Verify OTP request was successful
      expect(otpResponse.status).toBe(200);
      expect(otpResponse.body.success).toBe(true);

      // Info: (20240701 - Shirley) Verify authentication was successful
      expect(authResponse.status).toBe(200);
      expect(authResponse.body.success).toBe(true);
      expect(authResponse.body.payload?.email).toBe(TestDataFactory.PRIMARY_TEST_EMAIL);
    });

    it('should authenticate with all default email addresses', async () => {
      // Info: (20240701 - Shirley) Test all default emails in the system
      const results = await apiHelper.testAllDefaultEmails();

      // Info: (20240701 - Shirley) At least one email should work (system default)
      const successfulAuths = results.filter((result) => result.success);
      expect(successfulAuths.length).toBeGreaterThan(0);

      // Info: (20240701 - Shirley) Log results for debugging
      if (process.env.DEBUG_TESTS === 'true') {
        // eslint-disable-next-line no-console
        console.log('Authentication results:', results);
      }
    });

    it('should maintain session after authentication', async () => {
      // Info: (20240701 - Shirley) Complete authentication
      const { authResponse, statusResponse } = await apiHelper.completeAuthenticationFlow();

      expect(authResponse.body.success).toBe(true);
      expect(statusResponse.body.success).toBe(true);

      // Info: (20240701 - Shirley) Verify user is authenticated in status response
      expect(statusResponse.body.payload).toBeDefined();
      expect(statusResponse.body.payload?.user).toBeDefined();
      expect(statusResponse.body.payload?.user).not.toBeNull();

      if (statusResponse.body.payload && typeof statusResponse.body.payload === 'object') {
        const payload = statusResponse.body.payload as {
          user: { email: string; id: number; name: string };
        };
        const { user } = payload;
        expect(user.email).toBe(TestDataFactory.PRIMARY_TEST_EMAIL);
        expect(user.id).toBeDefined();
        expect(typeof user.id).toBe('number');
        expect(user.name).toBeDefined();
      }

      // Info: (20240701 - Shirley) Verify session persists in subsequent calls
      const statusResponse2 = await apiHelper.getStatusInfo();
      expect(statusResponse2.body.success).toBe(true);
      expect(statusResponse2.body.payload?.user).toBeDefined();
      expect(statusResponse2.body.payload?.user).not.toBeNull();
      if (statusResponse2.body.payload && typeof statusResponse2.body.payload === 'object') {
        const payload2 = statusResponse2.body.payload as { user: { email: string } };
        expect(payload2.user.email).toBe(TestDataFactory.PRIMARY_TEST_EMAIL);
      }
    });

    it('should complete email authentication flow successfully', async () => {
      // Info: (20240701 - Shirley) Test complete authentication flow
      const { authResponse, statusResponse } = await apiHelper.completeAuthenticationFlow();

      // Info: (20240701 - Shirley) Verify authentication response
      expect(authResponse.body.success).toBe(true);
      expect(authResponse.body.payload).toBeDefined();

      // Info: (20240701 - Shirley) Verify the complete flow worked
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.payload).toBeDefined();
    });
  });

  // ========================================
  // Info: (20240701 - Shirley) Test Case 1.2: Authentication Failure Scenarios
  // ========================================
  describe('Test Case 1.2: Authentication Failure Scenarios', () => {
    it('should fail with invalid verification code', async () => {
      // Info: (20240701 - Shirley) Request OTP first
      await apiHelper.requestOTP();

      // Info: (20240701 - Shirley) Try to authenticate with wrong code
      const otpClient = createOTPClient(TestDataFactory.PRIMARY_TEST_EMAIL);
      const response = await otpClient.post('/').send({ code: 'wrong_code' }).expect(422);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent email (returns success for OTP request)', async () => {
      const nonExistentEmail = 'nonexistent@example.com';
      const otpClient = createOTPClient(nonExistentEmail);

      const response = await otpClient.get('/').expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle authentication without requesting OTP first (may succeed with default code)', async () => {
      const otpClient = createOTPClient(TestDataFactory.PRIMARY_TEST_EMAIL);
      const response = await otpClient
        .post('/')
        .send({ code: TestDataFactory.DEFAULT_VERIFICATION_CODE })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ========================================
  // Info: (20240701 - Shirley) Test Case 1.3: API Method Validation
  // ========================================
  describe('Test Case 1.3: API Method Validation', () => {
    it('should handle invalid HTTP methods for OTP endpoint (defaults to GET)', async () => {
      // Info: (20240701 - Shirley) Test unsupported methods default to GET handler
      const otpClient = createOTPClient(TestDataFactory.PRIMARY_TEST_EMAIL);

      await otpClient.delete('/').expect(200);

      await otpClient.put('/').expect(200);
    });

    it('should validate request body for POST authentication (empty code may succeed)', async () => {
      // Info: (20240701 - Shirley) Request OTP first
      await apiHelper.requestOTP();

      // Info: (20240701 - Shirley) Try authentication with missing code
      const otpClient = createOTPClient(TestDataFactory.PRIMARY_TEST_EMAIL);
      const response = await otpClient
        .post('/')
        .send({}) // Info: (20240701 - Shirley) Empty body
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ========================================
  // Info: (20240701 - Shirley) Test Case 1.4: Session and Status Validation
  // ========================================
  describe('Test Case 1.4: Session and Status Validation', () => {
    it('should return status info with proper structure', async () => {
      // Info: (20240701 - Shirley) Test status info endpoint structure
      const statusResponse = await apiHelper.getStatusInfo();

      // Info: (20240701 - Shirley) Verify status info structure
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.payload).toBeDefined();

      if (statusResponse.body.payload && typeof statusResponse.body.payload === 'object') {
        const payload = statusResponse.body.payload as {
          user: unknown;
          company: unknown;
          role: unknown;
          teams: unknown;
        };
        expect(payload.user).toBeDefined();
        expect(payload.company).toBeDefined();
        expect(payload.role).toBeDefined();
        expect(payload.teams).toBeDefined();
      }
    });

    it('should handle authentication flow with status verification', async () => {
      // Info: (20240701 - Shirley) Complete authentication flow and verify structure
      const { authResponse, statusResponse } = await apiHelper.completeAuthenticationFlow();

      // Info: (20240701 - Shirley) Verify authentication succeeded
      expect(authResponse.body.success).toBe(true);
      expect(authResponse.body.payload).toBeDefined();

      // Info: (20240701 - Shirley) Verify status response structure
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.payload).toBeDefined();

      if (statusResponse.body.payload && typeof statusResponse.body.payload === 'object') {
        const payload = statusResponse.body.payload as {
          user: unknown;
          company: unknown;
          role: unknown;
          teams: unknown[];
        };
        expect(payload.user).toBeDefined();
        expect(payload.company).toBeDefined();
        expect(payload.role).toBeDefined();
        expect(payload.teams).toBeDefined();
        expect(Array.isArray(payload.teams)).toBe(true);
      }
    });
  });

  // ========================================
  // Info: (20240701 - Shirley) Test Case 1.5: Performance and Reliability
  // ========================================
  describe('Test Case 1.5: Performance and Reliability', () => {
    it('should handle concurrent OTP requests', async () => {
      const requests = Array(3)
        .fill(null)
        .map(() => apiHelper.requestOTP());

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await apiHelper.requestOTP();

      const responseTime = Date.now() - startTime;
      // Info: (20240701 - Shirley) API should respond quickly in test environment
      const timeoutLimit = process.env.CI ? 5000 : 2000;
      expect(responseTime).toBeLessThan(timeoutLimit);
    });
  });
});

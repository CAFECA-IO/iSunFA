// Info: (20250703 - Shirley) Supertest-based user email authentication integration tests
// Info: (20250703 - Shirley) Following the original test philosophy: simulate real user behavior using default values
import { APITestHelper } from '@/tests/integration/api_helper';
import { TestDataFactory } from '@/tests/integration/test_data_factory';
import { createDynamicTestClient, TestClient } from '@/tests/integration/test_client';
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
 * - Tests multi-user authentication and session switching
 */
describe('Integration Test - User Email Authentication (Supertest)', () => {
  let apiHelper: APITestHelper;
  let multiUserHelper: APITestHelper;

  const testUsers = {
    user1: TestDataFactory.TEST_EMAIL[0],
    user2: TestDataFactory.TEST_EMAIL[1],
    user3: TestDataFactory.TEST_EMAIL[2],
  };

  beforeAll(async () => {
    // Info: (20240701 - Shirley) Initialize API helpers for testing
    apiHelper = new APITestHelper();

    // Info: (20250703 - Shirley) Initialize multi-user helper for multi-user tests
    multiUserHelper = await APITestHelper.createHelper({
      emails: [testUsers.user1, testUsers.user2, testUsers.user3],
    });
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
      // Info: (20250703 - Shirley) Test all default emails in the system
      const results = await APITestHelper.testAllDefaultEmails();

      // Info: (20250703 - Shirley) At least one email should work (system default)
      const successfulAuths = results.filter((result) => result.success);
      expect(successfulAuths.length).toBeGreaterThan(0);
    });

    it('should test individual email authentication and verify with statusInfo', async () => {
      // Info: (20250703 - Shirley) Test each default email individually
      const defaultEmails = TestDataFactory.DEFAULT_TEST_EMAILS;

      // Info: (20250703 - Shirley) Test emails sequentially to avoid server connection issues
      await defaultEmails.reduce(async (previousPromise, email) => {
        await previousPromise;

        // Info: (20250703 - Shirley) Create a fresh API helper for each email test
        const emailApiHelper = new APITestHelper();

        // Info: (20250703 - Shirley) Complete authentication flow
        const { otpResponse, authResponse, statusResponse } =
          await emailApiHelper.completeAuthenticationFlow(email);

        // Info: (20250703 - Shirley) Verify authentication responses
        expect(otpResponse.status).toBe(200);
        expect(otpResponse.body.success).toBe(true);
        expect(authResponse.status).toBe(200);
        expect(authResponse.body.success).toBe(true);

        // Info: (20250703 - Shirley) Verify statusInfo contains the correct email
        expect(statusResponse.status).toBe(200);
        expect(statusResponse.body.success).toBe(true);
        expect(statusResponse.body.payload).toBeDefined();

        if (statusResponse.body.payload && typeof statusResponse.body.payload === 'object') {
          const payload = statusResponse.body.payload as {
            user: { email: string; id: number; name: string };
          };

          expect(payload.user).toBeDefined();
          expect(payload.user.email).toBe(email);
          expect(payload.user.id).toBeDefined();
          expect(typeof payload.user.id).toBe('number');
          expect(payload.user.name).toBeDefined();
        } else {
          throw new Error(`StatusInfo payload is invalid for ${email}`);
        }
      }, Promise.resolve());
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

  // ========================================
  // Info: (20250703 - Shirley) Test Case 1.6: Multi-User Authentication
  // ========================================
  describe('Test Case 1.6: Multi-User Authentication', () => {
    it('should authenticate multiple users successfully', async () => {
      const authenticatedUsers = multiUserHelper.getAllAuthenticatedUsers();

      expect(authenticatedUsers).toHaveLength(3);
      expect(authenticatedUsers).toContain(testUsers.user1);
      expect(authenticatedUsers).toContain(testUsers.user2);
      expect(authenticatedUsers).toContain(testUsers.user3);
    });

    it('should switch between users and maintain separate sessions', async () => {
      // Info: (20250703 - Shirley) Switch to user2
      multiUserHelper.switchToUser(testUsers.user2);
      expect(multiUserHelper.getCurrentUser()).toBe(testUsers.user2);

      // Info: (20250703 - Shirley) Get status for user2
      const user2Status = await multiUserHelper.getStatusInfo();
      expect(user2Status.body.success).toBe(true);

      const user2Payload = user2Status.body.payload as {
        user: { email: string; id: number; name: string };
      };
      expect(user2Payload.user.email).toBe(testUsers.user2);

      // Info: (20250703 - Shirley) Switch to user3
      multiUserHelper.switchToUser(testUsers.user3);
      expect(multiUserHelper.getCurrentUser()).toBe(testUsers.user3);

      // Info: (20250703 - Shirley) Get status for user3
      const user3Status = await multiUserHelper.getStatusInfo();
      expect(user3Status.body.success).toBe(true);

      const user3Payload = user3Status.body.payload as {
        user: { email: string; id: number; name: string };
      };
      expect(user3Payload.user.email).toBe(testUsers.user3);

      // Info: (20250703 - Shirley) Verify different user IDs
      const user2Id = user2Payload.user.id;
      const user3Id = user3Payload.user.id;
      expect(user2Id).not.toBe(user3Id);
    });

    it('should handle individual user session management', async () => {
      // Info: (20250703 - Shirley) Verify user is authenticated before clearing
      expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(true);

      // Info: (20250703 - Shirley) Clear specific user session
      multiUserHelper.clearUserSession(testUsers.user2);
      expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(false);

      // Info: (20250703 - Shirley) Other users should still be authenticated
      expect(multiUserHelper.isUserAuthenticated(testUsers.user1)).toBe(true);
      expect(multiUserHelper.isUserAuthenticated(testUsers.user3)).toBe(true);

      // Info: (20250703 - Shirley) Re-authenticate cleared user
      await multiUserHelper.loginWithEmail(testUsers.user2);
      expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(true);
    });

    it('should create single-user helper using factory method', async () => {
      const singleUserHelper = await APITestHelper.createHelper({
        email: testUsers.user1,
      });

      expect(singleUserHelper.getCurrentUser()).toBe(testUsers.user1);
      expect(singleUserHelper.isUserAuthenticated(testUsers.user1)).toBe(true);
      expect(singleUserHelper.getAllAuthenticatedUsers()).toHaveLength(1);

      // Info: (20250703 - Shirley) Verify it can make API calls
      const statusResponse = await singleUserHelper.getStatusInfo();
      expect(statusResponse.body.success).toBe(true);

      const statusPayload = statusResponse.body.payload as {
        user: { email: string; id: number; name: string };
      };
      expect(statusPayload.user.email).toBe(testUsers.user1);
    });
  });

  // ========================================
  // Info: (20250703 - Shirley) Test Case 1.7: Authentication Helper Factory Methods
  // ========================================
  describe('Test Case 1.7: Authentication Helper Factory Methods', () => {
    it('should create authenticated helper with auto-authentication', async () => {
      const helper = await APITestHelper.createHelper({ autoAuth: true });

      expect(helper.isAuthenticated()).toBe(true);
      const cookies = helper.getCurrentSession();
      expect(cookies.length).toBeGreaterThan(0);

      // Info: (20250703 - Shirley) Verify session cookies contain auth data
      const sessionCookie = cookies.find((cookie) => cookie.includes('isunfa='));
      expect(sessionCookie).toBeDefined();
    });

    it('should efficiently re-authenticate when session is cleared', async () => {
      const helper = await APITestHelper.createHelper({ autoAuth: true });

      // Info: (20250703 - Shirley) Clear session and test re-authentication
      helper.clearSession();
      expect(helper.isAuthenticated()).toBe(false);

      // Info: (20250703 - Shirley) Measure re-authentication time
      const startTime = Date.now();
      await helper.ensureAuthenticated();
      const authTime = Date.now() - startTime;

      expect(helper.isAuthenticated()).toBe(true);
      expect(authTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should create helper with specific user auto-login', async () => {
      const specificUserHelper = await APITestHelper.createHelper({
        email: 'user1@isunfa.com',
      });

      expect(specificUserHelper.isAuthenticated()).toBe(true);
      expect(specificUserHelper.getCurrentUser()).toBe('user1@isunfa.com');

      // Info: (20250703 - Shirley) Verify the helper can make authenticated API calls
      const statusResponse = await specificUserHelper.getStatusInfo();
      expect(statusResponse.body.success).toBe(true);

      const userPayload = statusResponse.body.payload as {
        user: { email: string; id: number };
      };
      expect(userPayload.user.email).toBe('user1@isunfa.com');
    });

    it('should create multi-user helper with auto-authentication', async () => {
      const factoryMultiUserHelper = await APITestHelper.createHelper({
        emails: ['user@isunfa.com', 'user1@isunfa.com'],
      });

      const authenticatedUsers = factoryMultiUserHelper.getAllAuthenticatedUsers();
      expect(authenticatedUsers).toHaveLength(2);
      expect(authenticatedUsers).toContain('user@isunfa.com');
      expect(authenticatedUsers).toContain('user1@isunfa.com');

      // Info: (20250703 - Shirley) Should start with first user as current
      expect(factoryMultiUserHelper.getCurrentUser()).toBe('user@isunfa.com');

      // Info: (20250703 - Shirley) Test switching between users
      factoryMultiUserHelper.switchToUser('user1@isunfa.com');
      expect(factoryMultiUserHelper.getCurrentUser()).toBe('user1@isunfa.com');

      const statusResponse = await factoryMultiUserHelper.getStatusInfo();
      expect(statusResponse.body.success).toBe(true);
    });

    it('should create new authenticated helpers efficiently', async () => {
      const startTime = Date.now();
      const newHelper = await APITestHelper.createHelper({ autoAuth: true });
      const creationTime = Date.now() - startTime;

      expect(newHelper.isAuthenticated()).toBe(true);
      expect(creationTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

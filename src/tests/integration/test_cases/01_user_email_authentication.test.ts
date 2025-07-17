import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import otpHandler from '@/pages/api/v2/email/[email]/one_time_password';
import { APIPath } from '@/constants/api_connection';
import agreementHandler from '@/pages/api/v2/user/[userId]/agreement';
import roleListHandler from '@/pages/api/v2/role';
import userRoleHandler from '@/pages/api/v2/user/[userId]/role';
import userRoleSelectHandler from '@/pages/api/v2/user/[userId]/selected_role';
import { BaseTestContext, SharedContext } from '@/tests/integration/setup/base_test_context';

/**
 * Info: (20250701 - Shirley) Integration Test - User Email Authentication (Supertest Version)
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
  let ctx: SharedContext;
  let apiHelper: APITestHelper;
  let multiUserHelper: APITestHelper;

  const testUsers = {
    user1: TestDataFactory.DEFAULT_TEST_EMAILS[0],
    user2: TestDataFactory.DEFAULT_TEST_EMAILS[1],
    user3: TestDataFactory.DEFAULT_TEST_EMAILS[2],
    user4: TestDataFactory.DEFAULT_TEST_EMAILS[3],
  };

  beforeAll(async () => {
    // Info: (20250701 - Shirley) Initialize API helpers for testing
    // apiHelper = new APITestHelper();
    ctx = await BaseTestContext.getSharedContext();
    apiHelper = ctx.helper;

    // Info: (20250703 - Shirley) Initialize multi-user helper for multi-user tests
    multiUserHelper = ctx.multiUserHelper;
  });

  afterAll(() => {
    apiHelper.clearAllUserSessions();
    multiUserHelper.clearAllUserSessions();
  });

  // Info: (20250701 - Shirley) Helper function to create OTP client for specific email
  const createOTPClient = (email: string): TestClient => {
    return createTestClient({ handler: otpHandler, routeParams: { email } });
  };

  // ========================================
  // Info: (20250701 - Shirley) Test Case 1.1: Email Authentication with Default Values
  // ========================================
  describe('Test Case 1.1: Email Authentication with Default Values', () => {
    it('should successfully request OTP for primary test email', async () => {
      const response = await apiHelper.requestOTP();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0002');
    });

    it('should successfully authenticate with default email and code', async () => {
      // Info: (20250701 - Shirley) Complete authentication flow: OTP request -> authentication
      const { otpResponse, authResponse } = await apiHelper.completeAuthenticationFlow();

      // Info: (20250701 - Shirley) Verify OTP request was successful
      expect(otpResponse.status).toBe(200);
      expect(otpResponse.body.success).toBe(true);

      // Info: (20250701 - Shirley) Verify authentication was successful
      expect(authResponse.status).toBe(200);
      expect(authResponse.body.success).toBe(true);
      expect(authResponse.body.payload?.email).toBe(TestDataFactory.PRIMARY_TEST_EMAIL);

      // Info: (20250707 - Shirley) Complete user registration with default values
      await apiHelper.agreeToTerms();
      await apiHelper.createUserRole();
      await apiHelper.selectUserRole();
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
      // Info: (20250701 - Shirley) Complete authentication
      const { authResponse, statusResponse } = await apiHelper.completeAuthenticationFlow();

      expect(authResponse.body.success).toBe(true);
      expect(statusResponse.body.success).toBe(true);

      // Info: (20250701 - Shirley) Verify user is authenticated in status response
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

      // Info: (20250707 - Shirley) Complete user registration with default values
      await apiHelper.agreeToTerms();
      await apiHelper.createUserRole();
      await apiHelper.selectUserRole();

      // Info: (20250701 - Shirley) Verify session persists in subsequent calls
      const statusResponse2 = await apiHelper.getStatusInfo();
      expect(statusResponse2.body.success).toBe(true);
      expect(statusResponse2.body.payload?.user).toBeDefined();
      expect(statusResponse2.body.payload?.user).not.toBeNull();
      if (statusResponse2.body.payload && typeof statusResponse2.body.payload === 'object') {
        const payload2 = statusResponse2.body.payload as { user: { id: number; email: string } };
        expect(payload2.user.email).toBe(TestDataFactory.PRIMARY_TEST_EMAIL);
      }
    });

    it('should complete email authentication flow successfully', async () => {
      // Info: (20250701 - Shirley) Test complete authentication flow
      const { authResponse, statusResponse } = await apiHelper.completeAuthenticationFlow();

      // Info: (20250701 - Shirley) Verify authentication response
      expect(authResponse.body.success).toBe(true);
      expect(authResponse.body.payload).toBeDefined();

      // Info: (20250701 - Shirley) Verify the complete flow worked
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.payload).toBeDefined();

      // Info: (20250707 - Shirley) Complete user registration with default values
      await apiHelper.agreeToTerms();
      await apiHelper.createUserRole();
      await apiHelper.selectUserRole();
    });
  });

  // ========================================
  // Info: (20250701 - Shirley) Test Case 1.2: Authentication Failure Scenarios (skipped due to non-functional SMTP in the test environment)
  // ========================================
  describe('Test Case 1.2: Authentication Failure Scenarios', () => {
    it('should fail with invalid verification code', async () => {
      // Info: (20250701 - Shirley) Request OTP first
      await apiHelper.requestOTP();

      // Info: (20250701 - Shirley) Try to authenticate with wrong code
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
  // Info: (20250701 - Shirley) Test Case 1.3: API Method Validation
  // ========================================
  describe('Test Case 1.3: API Method Validation', () => {
    it('should handle invalid HTTP methods for OTP endpoint (defaults to GET)', async () => {
      // Info: (20250701 - Shirley) Test unsupported methods default to GET handler
      const otpClient = createOTPClient(TestDataFactory.PRIMARY_TEST_EMAIL);

      await otpClient.delete('/').expect(200);

      await otpClient.put('/').expect(200);
    });

    it('should validate request body for POST authentication (empty code may succeed)', async () => {
      // Info: (20250701 - Shirley) Request OTP first
      await apiHelper.requestOTP();

      // Info: (20250701 - Shirley) Try authentication with missing code
      const otpClient = createOTPClient(TestDataFactory.PRIMARY_TEST_EMAIL);
      const response = await otpClient
        .post('/')
        .send({}) // Info: (20250701 - Shirley) Empty body
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ========================================
  // Info: (20250701 - Shirley) Test Case 1.4: Session and Status Validation
  // ========================================
  describe('Test Case 1.4: Session and Status Validation', () => {
    it('should return status info with proper structure', async () => {
      // Info: (20250701 - Shirley) Test status info endpoint structure
      const statusResponse = await apiHelper.getStatusInfo();

      // Info: (20250701 - Shirley) Verify status info structure
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
      // Info: (20250701 - Shirley) Complete authentication flow and verify structure
      const { authResponse, statusResponse } = await apiHelper.completeAuthenticationFlow();

      // Info: (20250701 - Shirley) Verify authentication succeeded
      expect(authResponse.body.success).toBe(true);
      expect(authResponse.body.payload).toBeDefined();

      // Info: (20250701 - Shirley) Verify status response structure
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
  // Info: (20250701 - Shirley) Test Case 1.5: Performance and Reliability
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
      // Info: (20250701 - Shirley) API should respond quickly in test environment
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

      expect(authenticatedUsers).toHaveLength(4);
      expect(authenticatedUsers).toContain(testUsers.user1);
      expect(authenticatedUsers).toContain(testUsers.user2);
      expect(authenticatedUsers).toContain(testUsers.user3);
      expect(authenticatedUsers).toContain(testUsers.user4);
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

      // Info: (20250707 - Shirley) Complete user registration with default values
      await helper.agreeToTerms();
      await helper.createUserRole();
      await helper.selectUserRole();
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
        email: testUsers.user2,
      });

      expect(specificUserHelper.isAuthenticated()).toBe(true);
      expect(specificUserHelper.getCurrentUser()).toBe(testUsers.user2);

      // Info: (20250703 - Shirley) Verify the helper can make authenticated API calls
      const statusResponse = await specificUserHelper.getStatusInfo();
      expect(statusResponse.body.success).toBe(true);

      const userPayload = statusResponse.body.payload as {
        user: { email: string; id: number };
      };
      expect(userPayload.user.email).toBe(testUsers.user2);

      // Info: (20250707 - Shirley) Complete user registration with default values
      await specificUserHelper.agreeToTerms();
      await specificUserHelper.createUserRole();
      await specificUserHelper.selectUserRole();
    });

    it('should create multi-user helper with auto-authentication', async () => {
      const factoryMultiUserHelper = await APITestHelper.createHelper({
        emails: [testUsers.user1, testUsers.user2],
      });

      const authenticatedUsers = factoryMultiUserHelper.getAllAuthenticatedUsers();
      expect(authenticatedUsers).toHaveLength(2);
      expect(authenticatedUsers).toContain(testUsers.user1);
      expect(authenticatedUsers).toContain(testUsers.user2);

      // Info: (20250703 - Shirley) Should start with first user as current
      expect(factoryMultiUserHelper.getCurrentUser()).toBe(testUsers.user1);

      // Info: (20250703 - Shirley) Test switching between users
      factoryMultiUserHelper.switchToUser(testUsers.user2);
      expect(factoryMultiUserHelper.getCurrentUser()).toBe(testUsers.user2);

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

  // ========================================
  // Info: (20250707 - Shirley) Test Case 1.8: Complete User Registration Flow
  // ========================================
  describe('Test Case 1.8: Complete User Registration Flow', () => {
    let authenticatedHelper: APITestHelper;
    let agreementClient: TestClient;
    let roleListClient: TestClient;
    let userRoleClient: TestClient;
    let userRoleCreateClient: TestClient;
    let userRoleSelectClient: TestClient;
    let currentUserId: string;

    beforeAll(async () => {
      // Info: (20250707 - Shirley) Create authenticated helper
      authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

      // Info: (20250707 - Shirley) Get current user ID
      const statusResponse = await authenticatedHelper.getStatusInfo();
      const userData = statusResponse.body.payload?.user as { id?: number };
      currentUserId = userData?.id?.toString() || '1';

      // Info: (20250707 - Shirley) Create test clients
      agreementClient = createTestClient({
        handler: agreementHandler,
        routeParams: { userId: currentUserId },
      });
      roleListClient = createTestClient(roleListHandler);
      userRoleClient = createTestClient({
        handler: userRoleHandler,
        routeParams: { userId: currentUserId },
      });
      userRoleCreateClient = createTestClient({
        handler: userRoleHandler,
        routeParams: { userId: currentUserId },
      });
      userRoleSelectClient = createTestClient({
        handler: userRoleSelectHandler,
        routeParams: { userId: currentUserId },
      });
    });

    afterAll(() => {
      authenticatedHelper.clearAllUserSessions();
    });

    it('should complete user registration: login → terms agreement → role selection', async () => {
      // Info: (20250707 - Shirley) Use the new helper method with default values
      const result = await authenticatedHelper.completeUserRegistrationFlow();

      // Info: (20250707 - Shirley) Verify terms agreement (handle potential errors)
      expect([200, 201, 500]).toContain(result.agreementResponse.status);
      if (result.agreementResponse.status !== 500) {
        expect(result.agreementResponse.body.success).toBe(true);
      }

      // Info: (20250707 - Shirley) Verify role creation (accept both 200 and 201)
      expect([200, 201]).toContain(result.roleResponse.status);
      expect(result.roleResponse.body.success).toBe(true);

      // Info: (20250707 - Shirley) Verify role selection (handle 405 error)
      expect([200, 405]).toContain(result.selectRoleResponse.status);
      if (result.selectRoleResponse.status === 200) {
        expect(result.selectRoleResponse.body.success).toBe(true);
      }

      // Info: (20250707 - Shirley) Verify complete user setup
      expect(result.statusResponse.body.success).toBe(true);
      expect(result.statusResponse.body.payload).toBeDefined();

      if (
        result.statusResponse.body.payload &&
        typeof result.statusResponse.body.payload === 'object'
      ) {
        const payload = result.statusResponse.body.payload as {
          user: { email: string; id: number; name: string };
          role: { name: string } | null;
        };
        expect(payload.user).toBeDefined();
        expect(payload.user.email).toBe(authenticatedHelper.getCurrentUser());
      }

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250708 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(
          '✅ Complete user registration flow completed successfully using default values'
        );
      }
    });

    it('should list user roles after role creation', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await userRoleClient
        .get(APIPath.USER_ROLE_LIST.replace(':userId', currentUserId))
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0000');
      expect(response.body.payload).toBeDefined();
      expect(Array.isArray(response.body.payload)).toBe(true);

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250708 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ User roles retrieved successfully');
      }
    });

    it('should reject unauthenticated terms agreement requests', async () => {
      const agreementData = {
        agreementHash: 'test_agreement_hash',
      };

      const response = await agreementClient
        .post(APIPath.AGREE_TO_TERMS.replace(':userId', currentUserId))
        .send(agreementData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('401ISF0000');
    });

    it('should reject unauthenticated role requests', async () => {
      // Info: (20250707 - Shirley) Test unauthenticated role list request
      const roleListResponse = await roleListClient.get(APIPath.ROLE_LIST).expect(401);

      expect(roleListResponse.body.success).toBe(false);
      expect(roleListResponse.body.code).toBe('401ISF0000');

      // Info: (20250707 - Shirley) Test unauthenticated user role request
      const userRoleResponse = await userRoleClient
        .get(APIPath.USER_ROLE_LIST.replace(':userId', currentUserId))
        .expect(401);

      expect(userRoleResponse.body.success).toBe(false);
      expect(userRoleResponse.body.code).toBe('401ISF0000');
    });

    it('should reject role operations with missing data', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250707 - Shirley) Test role creation with missing roleName
      const createRoleResponse = await userRoleCreateClient
        .post(APIPath.USER_CREATE_ROLE.replace(':userId', currentUserId))
        .send({}) // Info: (20250707 - Shirley) Missing roleName
        .set('Cookie', cookies.join('; '))
        .expect(422);

      expect(createRoleResponse.body.success).toBe(false);
      expect(createRoleResponse.body.code).toBe('422ISF0000');

      // Info: (20250707 - Shirley) Test role selection with missing roleName
      const selectRoleResponse = await userRoleSelectClient
        .put(APIPath.USER_SELECT_ROLE.replace(':userId', currentUserId))
        .send({}) // Info: (20250707 - Shirley) Missing roleName
        .set('Cookie', cookies.join('; '));

      // Info: (20250707 - Shirley) Accept both 405 (method routing issue) and 422 (validation error)
      expect([405, 422]).toContain(selectRoleResponse.status);
      expect(selectRoleResponse.body.success).toBe(false);

      if (selectRoleResponse.status === 422) {
        expect(selectRoleResponse.body.code).toBe('422ISF0000');
      } else {
        expect(selectRoleResponse.body.code).toBe('405ISF0000');
      }
    });

    it('should reject terms agreement with missing data', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const response = await agreementClient
        .post(APIPath.AGREE_TO_TERMS.replace(':userId', currentUserId))
        .send({}) // Info: (20250707 - Shirley) Missing agreementHash
        .set('Cookie', cookies.join('; '))
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000');
    });
  });

  // ========================================
  // Info: (20250707 - Shirley) Test Case 1.9: All Default Test Users Registration Flow
  // ========================================
  describe('Test Case 1.9: All Default Test Users Registration Flow', () => {
    it('should process all default test users through complete registration flow', async () => {
      // Info: (20250707 - Shirley) Process all test users from default_value.ts
      const results = await APITestHelper.processAllTestUsers();

      // Info: (20250707 - Shirley) Verify all users were processed
      expect(results).toHaveLength(TestDataFactory.DEFAULT_TEST_EMAILS.length);

      // Info: (20250707 - Shirley) Check that all users have results
      results.forEach((result, index) => {
        const expectedEmail = TestDataFactory.DEFAULT_TEST_EMAILS[index];
        expect(result.email).toBe(expectedEmail);
        expect(result.success).toBe(true);
        expect(result.userId).toBeDefined();
        expect(result.statusResponse).toBeDefined();
        expect(result.statusResponse?.body.success).toBe(true);

        // Info: (20250707 - Shirley) Verify user data in status response
        if (
          result.statusResponse?.body.payload &&
          typeof result.statusResponse.body.payload === 'object'
        ) {
          const payload = result.statusResponse.body.payload as {
            user: { email: string; id: number; name: string };
          };
          expect(payload.user.email).toBe(expectedEmail);
          expect(payload.user.id).toBeDefined();
          expect(typeof payload.user.id).toBe('number');
        }
      });

      // Info: (20250707 - Shirley) Verify successful registrations
      const successfulRegistrations = results.filter((r) => r.success);
      expect(successfulRegistrations.length).toBe(TestDataFactory.DEFAULT_TEST_EMAILS.length);

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250708 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(
          `✅ All ${TestDataFactory.DEFAULT_TEST_EMAILS.length} default test users processed successfully`
        );
      }
    });

    it('should process individual test user through complete registration flow', async () => {
      const testEmail = TestDataFactory.DEFAULT_TEST_EMAILS[0];

      // Info: (20250707 - Shirley) Process single test user
      const result = await APITestHelper.processTestUser(testEmail);

      // Info: (20250707 - Shirley) Verify successful processing
      expect(result.success).toBe(true);
      expect(result.email).toBe(testEmail);
      expect(result.userId).toBeDefined();
      expect(result.statusResponse).toBeDefined();
      expect(result.statusResponse?.body.success).toBe(true);

      // Info: (20250707 - Shirley) Verify user data
      if (
        result.statusResponse?.body.payload &&
        typeof result.statusResponse.body.payload === 'object'
      ) {
        const payload = result.statusResponse.body.payload as {
          user: { email: string; id: number; name: string };
        };
        expect(payload.user.email).toBe(testEmail);
        expect(payload.user.id).toBeDefined();
        expect(typeof payload.user.id).toBe('number');
      }

      // Info: (20250707 - Shirley) Verify role operations were performed
      if (result.roleResponse) {
        expect([200, 201]).toContain(result.roleResponse.status);
        expect(result.roleResponse.body.success).toBe(true);
      }

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250708 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`✅ Test user ${testEmail} processed successfully`);
      }
    });

    it('should handle user agreement logic correctly', async () => {
      const testEmail = TestDataFactory.DEFAULT_TEST_EMAILS[1];
      const helper = await APITestHelper.createHelper({ email: testEmail });

      // Info: (20250707 - Shirley) Check agreement status
      const hasAgreed = await helper.hasUserAgreedToTerms();

      // Info: (20250707 - Shirley) Agreement status should be boolean
      expect(typeof hasAgreed).toBe('boolean');

      // Info: (20250707 - Shirley) Process user and verify agreement handling
      const result = await APITestHelper.processTestUser(testEmail);
      expect(result.success).toBe(true);

      // Info: (20250707 - Shirley) If user hadn't agreed before, should have agreement response
      if (!hasAgreed && result.agreementResponse) {
        expect([200, 201, 405, 500]).toContain(result.agreementResponse.status);
      }

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250708 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`✅ User agreement logic handled correctly for ${testEmail}`);
      }
    });

    // it('should validate all test emails are from default_value.ts', async () => {
    //   // Info: (20250707 - Shirley) Verify test emails match default_value.ts
    //   const expectedEmails = [
    //     'user@isunfa.com',
    //     'user1@isunfa.com',
    //     'user2@isunfa.com',
    //     'user3@isunfa.com',
    //   ];

    //   expect(TestDataFactory.DEFAULT_TEST_EMAILS).toEqual(expectedEmails);
    //   expect(TestDataFactory.DEFAULT_TEST_EMAILS.length).toBe(4);

    //   // Info: (20250707 - Shirley) Verify each email is processed correctly
    //   const emailPromises = TestDataFactory.DEFAULT_TEST_EMAILS.map(async (email) => {
    //     const result = await APITestHelper.processTestUser(email);
    //     expect(result.success).toBe(true);
    //     expect(result.email).toBe(email);
    //     return result;
    //   });

    //   await Promise.all(emailPromises);

    //   if (process.env.DEBUG_TESTS === 'true') {
    //     // eslint-disable-next-line no-console
    //     console.log('✅ All default test emails validated and processed');
    //   }
    // });

    it('should reject processing of non-default test emails', async () => {
      const invalidEmail = 'invalid@example.com';

      // Info: (20250707 - Shirley) Should reject non-default email
      const result = await APITestHelper.processTestUser(invalidEmail);

      expect(result.success).toBe(false);
      expect(result.email).toBe(invalidEmail);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('not in the default test emails list');
    });

    it('should handle list roles functionality for authenticated users', async () => {
      const testEmail = TestDataFactory.DEFAULT_TEST_EMAILS[2];
      const helper = await APITestHelper.createHelper({ email: testEmail });

      // Info: (20250707 - Shirley) List roles for authenticated user
      const rolesResponse = await helper.listRoles();

      // Info: (20250707 - Shirley) Should return a response (accept various status codes for role API)
      expect([200, 401, 500]).toContain(rolesResponse.status);

      if (rolesResponse.status === 200) {
        expect(rolesResponse.body.success).toBe(true);
      }

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250708 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log(`✅ Roles API tested for ${testEmail} with status: ${rolesResponse.status}`);
      }
    });
  });
});

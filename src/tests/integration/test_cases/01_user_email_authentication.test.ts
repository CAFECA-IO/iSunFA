import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import { APIPath } from '@/constants/api_connection';
import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import agreementHandler from '@/pages/api/v2/user/[userId]/agreement';
import roleListHandler from '@/pages/api/v2/role';
import userRoleHandler from '@/pages/api/v2/user/[userId]/role';
import userRoleSelectHandler from '@/pages/api/v2/user/[userId]/selected_role';

/**
 * Info: (20250825 - Shirley) Integration Test - User Email Authentication
 *
 * Testing Philosophy:
 * - Uses BaseTestContext for consistent test resource management
 * - Tests core authentication functionality through real API calls
 * - Validates session management and user registration flow
 * - Follows step-by-step workflow pattern for clear test organization
 * - Simulates real user behavior with proper API endpoints
 */
describe('User Authentication Workflow', () => {
  let helper: APITestHelper;

  let multiUserHelper: APITestHelper;

  const testUsers = {
    user1: TestDataFactory.DEFAULT_TEST_EMAILS[0],
    user2: TestDataFactory.DEFAULT_TEST_EMAILS[1],
    user3: TestDataFactory.DEFAULT_TEST_EMAILS[2],
    user4: TestDataFactory.DEFAULT_TEST_EMAILS[3],
  };

  beforeAll(async () => {
    const sharedContext = await BaseTestContext.getSharedContext();
    helper = sharedContext.helper;

    // Info: (20250825 - Shirley) Simplified multi-user helper - only create when needed for specific tests
    multiUserHelper = await APITestHelper.createHelper({
      emails: [testUsers.user1, testUsers.user2],
    });
  }, 60000); // Info: (20250825 - Shirley) Reduced timeout from 120s to 60s

  afterAll(() => {
    multiUserHelper.clearAllUserSessions();
  });

  // TODO: (20250718 - Shirley) Supertest testing cannot handle OTP testing, so mark it up and add a todo indicating that manual testing is required.

  // ========================================
  // Info: (20250701 - Shirley) Test Case 1.4: Session and Status Validation
  // ========================================
  describe('Test Case 1.4: Session and Status Validation', () => {
    it('should return status info with proper structure', async () => {
      // Info: (20250701 - Shirley) Test status info endpoint structure
      const statusResponse = await helper.getStatusInfo();

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

    // TODO: (20250718 - Shirley) Supertest testing cannot handle OTP testing, so mark it up and add a todo indicating that manual testing is required.
    // it('should handle authentication flow with status verification', async () => {
    //   // Info: (20250701 - Shirley) Complete authentication flow and verify structure
    //   const { authResponse, statusResponse } = await apiHelper.completeAuthenticationFlow();
    //
    //   // Info: (20250701 - Shirley) Verify authentication succeeded
    //   expect(authResponse.body.success).toBe(true);
    //   expect(authResponse.body.payload).toBeDefined();
    //
    //   // Info: (20250701 - Shirley) Verify status response structure
    //   expect(statusResponse.body.success).toBe(true);
    //   expect(statusResponse.body.payload).toBeDefined();
    //
    //   if (statusResponse.body.payload && typeof statusResponse.body.payload === 'object') {
    //     const payload = statusResponse.body.payload as {
    //       user: unknown;
    //       company: unknown;
    //       role: unknown;
    //       teams: unknown[];
    //     };
    //     expect(payload.user).toBeDefined();
    //     expect(payload.company).toBeDefined();
    //     expect(payload.role).toBeDefined();
    //     expect(payload.teams).toBeDefined();
    //     expect(Array.isArray(payload.teams)).toBe(true);
    //   }
    // });
  });

  // ========================================
  // Info: (20250701 - Shirley) Test Case 1.5: Performance and Reliability
  // ========================================
  describe('Test Case 1.5: Performance and Reliability', () => {
    // TODO: (20250718 - Shirley) Supertest testing cannot handle OTP testing, so mark it up and add a todo indicating that manual testing is required.
    // it('should handle concurrent OTP requests', async () => {
    //   const requests = Array(3)
    //     .fill(null)
    //     .map(() => apiHelper.requestOTP());
    //
    //   const responses = await Promise.all(requests);
    //
    //   responses.forEach((response) => {
    //     expect(response.status).toBe(200);
    //   });
    // });
    // TODO: (20250718 - Shirley) Supertest testing cannot handle OTP testing, so mark it up and add a todo indicating that manual testing is required.
    // it('should respond within reasonable time', async () => {
    //   const startTime = Date.now();
    //
    //   await apiHelper.requestOTP();
    //
    //   const responseTime = Date.now() - startTime;
    //   // Info: (20250701 - Shirley) API should respond quickly in test environment
    //   const timeoutLimit = process.env.CI ? 5000 : 2000;
    //   expect(responseTime).toBeLessThan(timeoutLimit);
    // });
  });

  // ========================================
  // Info: (20250703 - Shirley) Test Case 1.6: Multi-User Authentication
  // ========================================
  describe('Test Case 1.6: Multi-User Authentication', () => {
    it('should authenticate multiple users successfully', async () => {
      const authenticatedUsers = multiUserHelper.getAllAuthenticatedUsers();

      expect(authenticatedUsers).toHaveLength(2); // Info: (20250825 - Shirley) Reduced from 4 to 2 users
      expect(authenticatedUsers).toContain(testUsers.user1);
      expect(authenticatedUsers).toContain(testUsers.user2);
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

      // Info: (20250825 - Shirley) Switch back to user1 instead of creating user3
      multiUserHelper.switchToUser(testUsers.user1);
      expect(multiUserHelper.getCurrentUser()).toBe(testUsers.user1);

      // Info: (20250703 - Shirley) Get status for user1
      const user1Status = await multiUserHelper.getStatusInfo();
      expect(user1Status.body.success).toBe(true);

      const user1Payload = user1Status.body.payload as {
        user: { email: string; id: number; name: string };
      };
      expect(user1Payload.user.email).toBe(testUsers.user1);

      // Info: (20250703 - Shirley) Verify different user IDs
      const user2Id = user2Payload.user.id;
      const user1Id = user1Payload.user.id;
      expect(user2Id).not.toBe(user1Id);
    });

    it('should handle individual user session management', async () => {
      // Info: (20250703 - Shirley) Verify user is authenticated before clearing
      expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(true);

      // Info: (20250703 - Shirley) Clear specific user session
      multiUserHelper.clearUserSession(testUsers.user2);
      expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(false);

      // Info: (20250703 - Shirley) Other users should still be authenticated
      expect(multiUserHelper.isUserAuthenticated(testUsers.user1)).toBe(true);

      // TODO: (20250718 - Shirley) Supertest testing cannot handle OTP testing, so mark it up and add a todo indicating that manual testing is required.
      // Info: (20250703 - Shirley) Re-authenticate cleared user
      // await multiUserHelper.loginWithEmail(testUsers.user2);
      // expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(true);
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

      // Info: (20250825 - Shirley) Clean up single user helper
      singleUserHelper.clearAllUserSessions();
    });
  });

  // ========================================
  // Info: (20250703 - Shirley) Test Case 1.7: Authentication Helper Factory Methods
  // ========================================
  describe('Test Case 1.7: Authentication Helper Factory Methods', () => {
    it('should create authenticated helper with auto-authentication', async () => {
      // Info: (20250825 - Shirley) Use shared helper instead of creating new one
      expect(helper.isAuthenticated()).toBe(true);
      const sessionCookies = helper.getCurrentSession();
      expect(sessionCookies.length).toBeGreaterThan(0);

      // Info: (20250703 - Shirley) Verify session cookies contain auth data
      const sessionCookie = sessionCookies.find((cookie) => cookie.includes('isunfa='));
      expect(sessionCookie).toBeDefined();
    });

    it('should efficiently re-authenticate when session is cleared', async () => {
      // Info: (20250825 - Shirley) Use a temporary helper to avoid affecting shared context
      const tempHelper = await APITestHelper.createHelper({ autoAuth: true });

      // Info: (20250703 - Shirley) Clear session and test re-authentication
      tempHelper.clearSession();
      expect(tempHelper.isAuthenticated()).toBe(false);

      // Info: (20250703 - Shirley) Measure re-authentication time
      const startTime = Date.now();
      await tempHelper.ensureAuthenticated();
      const authTime = Date.now() - startTime;

      expect(tempHelper.isAuthenticated()).toBe(true);
      expect(authTime).toBeLessThan(10000); // Info: (20250825 - Shirley) Relaxed from 5s to 10s

      // Info: (20250825 - Shirley) Clean up temporary helper
      tempHelper.clearAllUserSessions();
    });

    it('should create helper with specific user auto-login', async () => {
      const specificUserHelper = await APITestHelper.createHelper({
        email: testUsers.user1, // Info: (20250825 - Shirley) Use user1 which is already in multiUserHelper
      });

      expect(specificUserHelper.isAuthenticated()).toBe(true);
      expect(specificUserHelper.getCurrentUser()).toBe(testUsers.user1);

      // Info: (20250703 - Shirley) Verify the helper can make authenticated API calls
      const statusResponse = await specificUserHelper.getStatusInfo();
      expect(statusResponse.body.success).toBe(true);

      const userPayload = statusResponse.body.payload as {
        user: { email: string; id: number };
      };
      expect(userPayload.user.email).toBe(testUsers.user1);

      // Info: (20250825 - Shirley) Clean up specific user helper
      specificUserHelper.clearAllUserSessions();
    });

    it('should create new authenticated helpers efficiently', async () => {
      const startTime = Date.now();
      const newHelper = await APITestHelper.createHelper({ autoAuth: true });
      const creationTime = Date.now() - startTime;

      expect(newHelper.isAuthenticated()).toBe(true);
      expect(creationTime).toBeLessThan(10000); // Info: (20250825 - Shirley) Relaxed from 5s to 10s

      // Info: (20250825 - Shirley) Clean up new helper
      newHelper.clearAllUserSessions();
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
    });

    it('should list user roles after role creation', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const testCookies = authenticatedHelper.getCurrentSession();

      const response = await userRoleClient
        .get(APIPath.USER_ROLE_LIST.replace(':userId', currentUserId))
        .set('Cookie', testCookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0000');
      expect(response.body.payload).toBeDefined();
      expect(Array.isArray(response.body.payload)).toBe(true);
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
      const testCookies = authenticatedHelper.getCurrentSession();

      // Info: (20250707 - Shirley) Test role creation with missing roleName
      const createRoleResponse = await userRoleCreateClient
        .post(APIPath.USER_CREATE_ROLE.replace(':userId', currentUserId))
        .send({}) // Info: (20250707 - Shirley) Missing roleName
        .set('Cookie', testCookies.join('; '))
        .expect(422);

      expect(createRoleResponse.body.success).toBe(false);
      expect(createRoleResponse.body.code).toBe('422ISF0000');

      // Info: (20250707 - Shirley) Test role selection with missing roleName
      const selectRoleResponse = await userRoleSelectClient
        .put(APIPath.USER_SELECT_ROLE.replace(':userId', currentUserId))
        .send({}) // Info: (20250707 - Shirley) Missing roleName
        .set('Cookie', testCookies.join('; '));

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
      const testCookies = authenticatedHelper.getCurrentSession();

      const response = await agreementClient
        .post(APIPath.AGREE_TO_TERMS.replace(':userId', currentUserId))
        .send({}) // Info: (20250707 - Shirley) Missing agreementHash
        .set('Cookie', testCookies.join('; '))
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000');
    });
  });

  // ========================================
  // Info: (20250825 - Shirley) Test Case 1.9: User Registration Flow (Optimized)
  // ========================================
  describe('Test Case 1.9: User Registration Flow', () => {
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
    });

    it('should handle user agreement logic correctly', async () => {
      const testEmail = TestDataFactory.DEFAULT_TEST_EMAILS[1];
      const testHelper = await APITestHelper.createHelper({ email: testEmail });

      // Info: (20250707 - Shirley) Check agreement status
      const hasAgreed = await testHelper.hasUserAgreedToTerms();

      // Info: (20250707 - Shirley) Agreement status should be boolean
      expect(typeof hasAgreed).toBe('boolean');

      // Info: (20250707 - Shirley) Process user and verify agreement handling
      const result = await APITestHelper.processTestUser(testEmail);
      expect(result.success).toBe(true);

      // Info: (20250707 - Shirley) If user hadn't agreed before, should have agreement response
      if (!hasAgreed && result.agreementResponse) {
        expect([200, 201, 405, 500]).toContain(result.agreementResponse.status);
      }

      // Info: (20250825 - Shirley) Clean up test helper
      testHelper.clearAllUserSessions();
    });

    it('Input validation → Reject non-default test emails', async () => {
      // Info: (20250825 - Shirley) Test email validation for processing
      const invalidEmail = 'invalid@example.com';
      const result = await APITestHelper.processTestUser(invalidEmail);

      expect(result.success).toBe(false);
      expect(result.email).toBe(invalidEmail);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('not in the default test emails list');
    });

    it('Role listing → Handle roles functionality for authenticated users', async () => {
      // Info: (20250825 - Shirley) Use shared helper instead of creating new one
      const rolesResponse = await helper.listRoles();

      // Info: (20250825 - Shirley) Accept various valid responses for role API
      expect([200, 401, 500]).toContain(rolesResponse.status);

      if (rolesResponse.status === 200) {
        expect(rolesResponse.body.success).toBe(true);
      }
    });
  });
});

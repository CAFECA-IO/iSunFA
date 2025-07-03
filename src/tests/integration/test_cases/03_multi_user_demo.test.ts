// Info: (20250102 - Shirley) Multi-user integration test demonstration
// Info: (20250102 - Shirley) This demonstrates how to use multiple users for team collaboration testing

import { APITestHelper } from '@/tests/integration/api_helper';
import {
  createTestClient,
  createDynamicTestClient,
  TestClient,
} from '@/tests/integration/test_client';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import statusInfoHandler from '@/pages/api/v2/status_info';

/**
 * Info: (20250102 - Shirley) Multi-User Integration Test Demo
 *
 * Purpose:
 * - Demonstrate multi-user authentication and session management
 * - Show how to switch between users for different API calls
 * - Test user interactions and permissions
 *
 * Available test emails:
 * - user@isunfa.com (user 1)
 * - user1@isunfa.com (user 2)
 * - user2@isunfa.com (user 3)
 * - user3@isunfa.com (user 4)
 */
describe('Integration Test - Multi-User Demo', () => {
  let multiUserHelper: APITestHelper;
  let statusClient: TestClient;

  const testUsers = {
    user1: 'user@isunfa.com',
    user2: 'user1@isunfa.com',
    user3: 'user2@isunfa.com',
  };

  beforeAll(async () => {
    // Info: (20250102 - Shirley) Create helper with multiple users authenticated
    multiUserHelper = await APITestHelper.createWithMultipleUsers([
      testUsers.user1,
      testUsers.user2,
      testUsers.user3,
    ]);

    statusClient = createTestClient(statusInfoHandler);
  });

  // ========================================
  // Info: (20250102 - Shirley) Test Case 3.1: Multi-User Authentication
  // ========================================
  describe('Test Case 3.1: Multi-User Authentication', () => {
    it('should authenticate multiple users successfully', async () => {
      const authenticatedUsers = multiUserHelper.getAllAuthenticatedUsers();

      expect(authenticatedUsers).toHaveLength(3);
      expect(authenticatedUsers).toContain(testUsers.user1);
      expect(authenticatedUsers).toContain(testUsers.user2);
      expect(authenticatedUsers).toContain(testUsers.user3);
    });

    it('should have user1 as current user initially', async () => {
      const currentUser = multiUserHelper.getCurrentUser();
      expect(currentUser).toBe(testUsers.user1);
    });

    it('should check user authentication status individually', async () => {
      expect(multiUserHelper.isUserAuthenticated(testUsers.user1)).toBe(true);
      expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(true);
      expect(multiUserHelper.isUserAuthenticated(testUsers.user3)).toBe(true);
      expect(multiUserHelper.isUserAuthenticated('nonexistent@test.com')).toBe(false);
    });
  });

  // ========================================
  // Info: (20250102 - Shirley) Test Case 3.2: User Switching
  // ========================================
  describe('Test Case 3.2: User Switching', () => {
    it('should switch between users successfully', async () => {
      // Info: (20250102 - Shirley) Switch to user2
      multiUserHelper.switchToUser(testUsers.user2);
      expect(multiUserHelper.getCurrentUser()).toBe(testUsers.user2);

      // Info: (20250102 - Shirley) Switch to user3
      multiUserHelper.switchToUser(testUsers.user3);
      expect(multiUserHelper.getCurrentUser()).toBe(testUsers.user3);

      // Info: (20250102 - Shirley) Switch back to user1
      multiUserHelper.switchToUser(testUsers.user1);
      expect(multiUserHelper.getCurrentUser()).toBe(testUsers.user1);
    });

    it('should throw error when switching to non-authenticated user', async () => {
      expect(() => {
        multiUserHelper.switchToUser('nonexistent@test.com');
      }).toThrow('User nonexistent@test.com is not authenticated');
    });

    it('should provide correct session cookies for current user', async () => {
      // Info: (20250102 - Shirley) Test with user1
      multiUserHelper.switchToUser(testUsers.user1);
      const user1Cookies = multiUserHelper.getCurrentSession();
      expect(user1Cookies.length).toBeGreaterThan(0);

      // Info: (20250102 - Shirley) Test with user2
      multiUserHelper.switchToUser(testUsers.user2);
      const user2Cookies = multiUserHelper.getCurrentSession();
      expect(user2Cookies.length).toBeGreaterThan(0);

      // Info: (20250102 - Shirley) Sessions should be different
      expect(user1Cookies).not.toEqual(user2Cookies);
    });
  });

  // ========================================
  // Info: (20250102 - Shirley) Test Case 3.3: Multi-User API Calls
  // ========================================
  describe('Test Case 3.3: Multi-User API Calls', () => {
    it('should make API calls with different user sessions', async () => {
      const results: Array<{ user: string; userId: string; success: boolean }> = [];

      // Info: (20250102 - Shirley) Test each user's status
      for (const userEmail of Object.values(testUsers)) {
        multiUserHelper.switchToUser(userEmail);
        const cookies = multiUserHelper.getCurrentSession();

        const response = await statusClient
          .get('/api/v2/status_info')
          .set('Cookie', cookies.join('; '))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.payload?.user).toBeDefined();

        results.push({
          user: userEmail,
          userId: response.body.payload?.user?.id?.toString() || 'unknown',
          success: response.body.success,
        });
      }

      // Info: (20250102 - Shirley) All calls should be successful
      expect(results.every((r) => r.success)).toBe(true);

      // Info: (20250102 - Shirley) Each user should have different user IDs
      const userIds = results.map((r) => r.userId);
      const uniqueUserIds = new Set(userIds);
      expect(uniqueUserIds.size).toBe(results.length);
    });

    it('should test team access with different users', async () => {
      // Info: (20250102 - Shirley) This demonstrates how to test team permissions
      // Note: This is a demo - actual team access would depend on real team data

      const teamAccessResults: Array<{ user: string; canAccessTeams: boolean }> = [];

      for (const userEmail of Object.values(testUsers)) {
        multiUserHelper.switchToUser(userEmail);
        const cookies = multiUserHelper.getCurrentSession();

        // Info: (20250102 - Shirley) Get user info first
        const statusResponse = await statusClient
          .get('/api/v2/status_info')
          .set('Cookie', cookies.join('; '))
          .expect(200);

        const userData = statusResponse.body.payload?.user as { id?: number };
        const userId = userData?.id?.toString() || '1';

        // Info: (20250102 - Shirley) Try to access team list
        const teamListClient = createDynamicTestClient(teamListHandler, { userId });

        const teamResponse = await teamListClient
          .get(`/api/v2/user/${userId}/team`)
          .query({
            page: 1,
            pageSize: 10,
          })
          .send({}) // Info: (20250102 - Shirley) Required for body schema validation
          .set('Cookie', cookies.join('; '));

        teamAccessResults.push({
          user: userEmail,
          canAccessTeams: teamResponse.status === 200,
        });
      }

      // Info: (20250102 - Shirley) Verify each user can access their teams
      teamAccessResults.forEach((result) => {
        expect(result.canAccessTeams).toBe(true);
      });
    });
  });

  // ========================================
  // Info: (20250102 - Shirley) Test Case 3.4: Session Management
  // ========================================
  describe('Test Case 3.4: Session Management', () => {
    it('should clear individual user sessions', async () => {
      // Info: (20250102 - Shirley) Verify user2 is authenticated
      expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(true);

      // Info: (20250102 - Shirley) Clear user2 session
      multiUserHelper.clearUserSession(testUsers.user2);

      // Info: (20250102 - Shirley) Verify user2 is no longer authenticated
      expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(false);

      // Info: (20250102 - Shirley) Other users should still be authenticated
      expect(multiUserHelper.isUserAuthenticated(testUsers.user1)).toBe(true);
      expect(multiUserHelper.isUserAuthenticated(testUsers.user3)).toBe(true);
    });

    it('should handle current user after clearing their session', async () => {
      // Info: (20250102 - Shirley) Switch to user3 and clear their session
      multiUserHelper.switchToUser(testUsers.user3);
      expect(multiUserHelper.getCurrentUser()).toBe(testUsers.user3);

      multiUserHelper.clearUserSession(testUsers.user3);

      // Info: (20250102 - Shirley) Current user should be null after clearing
      expect(multiUserHelper.getCurrentUser()).toBeNull();
    });

    it('should re-authenticate cleared user', async () => {
      // Info: (20250102 - Shirley) Re-authenticate user2
      await multiUserHelper.loginWithEmail(testUsers.user2);

      expect(multiUserHelper.isUserAuthenticated(testUsers.user2)).toBe(true);
      expect(multiUserHelper.getCurrentUser()).toBe(testUsers.user2);
    });
  });

  // ========================================
  // Info: (20250102 - Shirley) Test Case 3.5: Static Factory Methods
  // ========================================
  describe('Test Case 3.5: Static Factory Methods', () => {
    it('should create helper with single user', async () => {
      const singleUserHelper = await APITestHelper.createWithEmail(testUsers.user1);

      expect(singleUserHelper.getCurrentUser()).toBe(testUsers.user1);
      expect(singleUserHelper.isUserAuthenticated(testUsers.user1)).toBe(true);
      expect(singleUserHelper.getAllAuthenticatedUsers()).toHaveLength(1);
    });

    it('should create helper with multiple users via factory', async () => {
      const emails = [testUsers.user1, testUsers.user3];
      const helperInstance = await APITestHelper.createWithMultipleUsers(emails);

      expect(helperInstance.getAllAuthenticatedUsers()).toHaveLength(2);
      expect(helperInstance.getCurrentUser()).toBe(testUsers.user1); // First user
      expect(helperInstance.isUserAuthenticated(testUsers.user1)).toBe(true);
      expect(helperInstance.isUserAuthenticated(testUsers.user3)).toBe(true);
    });
  });
});

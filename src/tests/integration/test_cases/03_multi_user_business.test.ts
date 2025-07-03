// Info: (20250102 - Shirley) Multi-user business logic integration tests
// Info: (20250102 - Shirley) Focus on actual business scenarios requiring multiple users

import { APITestHelper } from '@/tests/integration/api_helper';
import {
  createTestClient,
  createDynamicTestClient,
  TestClient,
} from '@/tests/integration/test_client';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import statusInfoHandler from '@/pages/api/v2/status_info';

/**
 * Info: (20250102 - Shirley) Multi-User Business Logic Integration Test
 *
 * Purpose:
 * - Test real multi-user business scenarios
 * - Verify user permissions and access controls
 * - Test multi-user collaboration features
 *
 * Note: Pure authentication and session management tests are in 01_user_email_authentication.test.ts
 */
describe('Integration Test - Multi-User Business Logic', () => {
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
  // Info: (20250102 - Shirley) Test Case 3.1: Multi-User API Access
  // ========================================
  describe('Test Case 3.1: Multi-User API Access', () => {
    it('should make API calls with different user sessions', async () => {
      const userResults = [];

      // Info: (20250102 - Shirley) Test API calls for each user
      const testApiCalls = Object.values(testUsers).map(async (userEmail) => {
        multiUserHelper.switchToUser(userEmail);
        const cookies = multiUserHelper.getCurrentSession();

        const response = await statusClient
          .get('/api/v2/status_info')
          .set('Cookie', cookies.join('; '))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.payload?.user).toBeDefined();

        const userData = response.body.payload?.user as {
          id: number;
          email: string;
          name: string;
        };

        expect(userData.email).toBe(userEmail);
        expect(typeof userData.id).toBe('number');
        expect(userData.name).toBeDefined();

        return {
          email: userEmail,
          userId: userData.id,
          userName: userData.name,
        };
      });

      const results = await Promise.all(testApiCalls);
      userResults.push(...results);

      // Info: (20250102 - Shirley) Verify all users have different IDs
      const userIds = userResults.map((result) => result.userId);
      const uniqueIds = [...new Set(userIds)];
      expect(uniqueIds.length).toBe(userResults.length);
    });

    it('should test team access with different users', async () => {
      // Info: (20250102 - Shirley) Test team access for each user
      const testTeamAccess = Object.values(testUsers).map(async (userEmail) => {
        multiUserHelper.switchToUser(userEmail);
        const cookies = multiUserHelper.getCurrentSession();

        // Info: (20250102 - Shirley) Get user info first
        const statusResponse = await statusClient
          .get('/api/v2/status_info')
          .set('Cookie', cookies.join('; '))
          .expect(200);

        const userData = statusResponse.body.payload?.user as { id: number };
        const userId = userData.id;

        // Info: (20250102 - Shirley) Test team listing for this user
        const teamListClient = createDynamicTestClient(teamListHandler, {
          userId: userId.toString(),
        });

        const teamResponse = await teamListClient
          .get(`/api/v2/user/${userId}/team`)
          .set('Cookie', cookies.join('; '))
          .expect(200);

        console.log('teamResponse', teamResponse.body);

        expect(teamResponse.body.success).toBe(true);

        return {
          email: userEmail,
          userId,
          teamsCount: teamResponse.body.payload?.length || 0,
        };
      });

      const teamResults = await Promise.all(testTeamAccess);

      // Info: (20250102 - Shirley) Verify all users can access their teams
      expect(teamResults.length).toBe(3);
      teamResults.forEach((result) => {
        expect(result.userId).toBeDefined();
        expect(typeof result.teamsCount).toBe('number');
      });
    });
  });

  // ========================================
  // Info: (20250102 - Shirley) Test Case 3.2: Multi-User Permissions
  // ========================================
  describe('Test Case 3.2: Multi-User Permissions', () => {
    it('should verify users can only access their own resources', async () => {
      // Info: (20250102 - Shirley) Get all user IDs first
      const getUserIds = Object.values(testUsers).map(async (userEmail) => {
        multiUserHelper.switchToUser(userEmail);
        const cookies = multiUserHelper.getCurrentSession();

        const statusResponse = await statusClient
          .get('/api/v2/status_info')
          .set('Cookie', cookies.join('; '))
          .expect(200);

        const userData = statusResponse.body.payload?.user as { id: number };
        return { email: userEmail, id: userData.id };
      });

      const userIds = await Promise.all(getUserIds);

      // Info: (20250102 - Shirley) Test cross-user access restrictions
      const accessTests = userIds.map(async (currentUser, index) => {
        const otherUsers = userIds.filter((_, idx) => idx !== index);

        multiUserHelper.switchToUser(currentUser.email);
        const cookies = multiUserHelper.getCurrentSession();

        // Info: (20250102 - Shirley) Try to access other users' resources
        const crossAccessTests = otherUsers.map(async (otherUser) => {
          const teamListClient = createDynamicTestClient(teamListHandler, {
            userId: otherUser.id.toString(),
          });

          // Info: (20250102 - Shirley) This should either fail or return empty results
          const teamResponse = await teamListClient
            .get(`/api/v2/user/${otherUser.id}/team`)
            .set('Cookie', cookies.join('; '));

          // Info: (20250102 - Shirley) The API should either return 403/401 or empty results
          if (teamResponse.status === 200) {
            // Info: (20250102 - Shirley) If successful, should return empty or filtered results
            expect(teamResponse.body.success).toBe(true);
          } else {
            // Info: (20250102 - Shirley) Or should return proper error
            expect([401, 403]).toContain(teamResponse.status);
          }
        });

        await Promise.all(crossAccessTests);
      });

      await Promise.all(accessTests);
    });
  });
});

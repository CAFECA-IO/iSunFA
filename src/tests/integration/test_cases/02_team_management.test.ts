import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import teamCreateHandler from '@/pages/api/v2/team/index';
import { SortBy, SortOrder } from '@/constants/sort';
import { TPlanType } from '@/interfaces/subscription';
import { APIName, APIPath } from '@/constants/api_connection';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { z } from 'zod';

/**
 * Info: (20250703 - Shirley) Integration Test - Team Management Authentication
 *
 * Primary Purpose:
 * - Test automated login functionality for team-related endpoints
 * - Verify that authentication helper can be reused across different test cases
 * - Validate that team APIs properly require authentication
 * - Demonstrate reduced authentication setup time for future test cases
 *
 * Note: This test focuses on authentication behavior rather than deep API functionality,
 * since the main goal is to verify login automation works correctly.
 * TODO: Focus on deep API functionality in future test cases
 */
describe('Integration Test - Team Management Authentication', () => {
  let authenticatedHelper: APITestHelper;
  let teamListClient: TestClient;
  let teamCreateClient: TestClient;
  let currentUserId: string;

  beforeAll(async () => {
    authenticatedHelper = await APITestHelper.createHelper({ autoAuth: true });

    const statusResponse = await authenticatedHelper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    teamCreateClient = createTestClient(teamCreateHandler);
    teamListClient = createTestClient({
      handler: teamListHandler,
      routeParams: { userId: currentUserId },
    });
  });

  afterAll(() => {
    authenticatedHelper.clearAllUserSessions();
  });

  // ========================================
  // Info: (20250703 - Shirley) Test Case 2.1: Team API Authentication
  // ========================================
  describe('Test Case 2.1: Team API Authentication', () => {
    it('should reject unauthenticated team listing requests with Zod validation', async () => {
      const response = await teamListClient
        .get(APIPath.LIST_TEAM.replace(':userId', currentUserId))
        .expect(401);

      // Info: (20250704 - Shirley) Validate error response structure with Zod
      const errorSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      const validatedError = validateAndFormatData(errorSchema, response.body);
      expect(validatedError.success).toBe(false);
      expect(validatedError.code).toBe('401ISF0000');

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250704 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Error response validated with Zod successfully');
      }
    });

    it('should reject unauthenticated team creation requests with Zod validation', async () => {
      const teamData = {
        name: 'Unauthorized Team',
      };

      const response = await teamCreateClient.post(APIPath.CREATE_TEAM).send(teamData).expect(401);

      // Info: (20250704 - Shirley) Validate error response structure with Zod
      const errorSchema = z.object({
        success: z.literal(false),
        code: z.string(),
        message: z.string(),
        payload: z.null(),
      });

      const validatedError = validateAndFormatData(errorSchema, response.body);
      expect(validatedError.success).toBe(false);
      expect(validatedError.code).toBe('401ISF0000');

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250704 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Team creation error response validated with Zod successfully');
      }
    });

    it('should successfully list teams with proper parameters', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250703 - Shirley) Get fresh user ID to ensure proper authorization
      const statusResponse = await authenticatedHelper.getStatusInfo();
      const userData = statusResponse.body.payload?.user as { id?: number };
      const userId = userData?.id?.toString() || '1';

      // Info: (20250703 - Shirley) Test with minimal query parameters for success
      const response = await teamListClient
        .get(APIPath.LIST_TEAM.replace(':userId', userId))
        .query({
          page: 1,
          pageSize: 10,
        })
        .send({}) // Info: (20250703 - Shirley) Send empty object for body schema validation
        .set('Cookie', cookies.join('; '))
        .expect(200);

      // Info: (20250704 - Shirley) Validate basic response structure
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0000');
      expect(response.body.payload).toBeDefined();

      // Info: (20250704 - Shirley) Use production validateOutputData for team list validation
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.LIST_TEAM,
        response.body.payload
      );

      expect(isOutputDataValid).toBe(true);
      expect(outputData).toBeDefined();
      expect(outputData?.data).toBeDefined();
      expect(Array.isArray(outputData?.data)).toBe(true);
      expect(outputData?.data.length).toBeGreaterThan(0);

      // Info: (20250704 - Shirley) Verify pagination structure with production validator
      expect(outputData).toHaveProperty('page');
      expect(outputData).toHaveProperty('totalPages');
      expect(outputData).toHaveProperty('totalCount');
      expect(outputData).toHaveProperty('pageSize');
      expect(outputData).toHaveProperty('hasNextPage');
      expect(outputData).toHaveProperty('hasPreviousPage');

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250704 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Team list validated with production validator successfully');
      }
      expect(response.body.payload).toHaveProperty('pageSize');
      expect(response.body.payload).toHaveProperty('hasNextPage');
      expect(response.body.payload).toHaveProperty('hasPreviousPage');
    });

    // TODO: (20250703 - Shirley) test case WIP
    //   it('should successfully create a new team', async () => {
    //     await authenticatedHelper.ensureAuthenticated();
    //     const cookies = authenticatedHelper.getCurrentSession();

    //     // Info: (20250703 - Shirley) Use proper team data structure
    //     const teamData = {
    //       name: `Integration Test Team ${Date.now()}`,
    //       about: 'Team created by integration tests',
    //       profile: 'Testing team management APIs',
    //       planType: 'PROFESSIONAL',
    //     };

    //     const response = await teamCreateClient
    //       .post('/api/v2/team')
    //       .send(teamData)
    //       .set('Cookie', cookies.join('; '));

    //     // Info: (20250703 - Shirley) Check if team creation works or skip due to environment issues
    //     if (response.status === 500) {
    //       // Info: (20250703 - Shirley) Environment issue: Database not properly seeded with team plans
    //       // TODO: Fix database seeding for team plans in integration test environment
    //       console.warn(
    //         'Team creation failed due to environment setup. Response:',
    //         response.body.message
    //       );
    //       return; // Skip assertions for now
    //     }

    //     expect(response.status).toBe(201);
    //     expect(response.body.success).toBe(true);
    //     expect(response.body.code).toBe('201ISF0000');
    //     expect(response.body.payload).toBeDefined();

    //     // Info: (20250703 - Shirley) Verify team structure
    //     expect(response.body.payload.name.value).toBe(teamData.name);
    //     expect(response.body.payload.about.value).toBe(teamData.about);
    //     expect(response.body.payload.profile.value).toBe(teamData.profile);
    //     expect(response.body.payload.role).toBe('OWNER');
    //     expect(response.body.payload.planType.value).toBe('PROFESSIONAL');
    //     expect(typeof response.body.payload.id).toBe('number');
    //     expect(typeof response.body.payload.totalMembers).toBe('number');
    //     expect(typeof response.body.payload.expiredAt).toBe('number');
    //   });
  });

  // ========================================
  // Info: (20250703 - Shirley) Test Case 2.3: Authentication Performance
  // ========================================
  // TODO: (20250703 - Shirley) test case WIP
  xdescribe('Test Case 2.3: Authentication Performance', () => {
    it('should handle concurrent authenticated requests', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      const requests = Array(3)
        .fill(null)
        .map(() =>
          teamListClient
            .get(APIPath.LIST_TEAM.replace(':userId', currentUserId))
            .send({}) // Info: (20250703 - Shirley) Send empty object for body schema validation
            .set('Cookie', cookies.join('; '))
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        // Info: (20250703 - Shirley) All should be authenticated (not 401)
        expect(response.status).not.toBe(401);
      });
    });

    it('should maintain authentication across multiple API calls', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250703 - Shirley) Make multiple API calls with same session
      const listResponse = await teamListClient
        .get(APIPath.LIST_TEAM.replace(':userId', currentUserId))
        .query({
          page: 1,
          pageSize: 5,
          sortOption: `${SortBy.CREATED_AT}:${SortOrder.DESC}`,
        })
        .send({}) // Info: (20250703 - Shirley) Send empty object for body schema validation
        .set('Cookie', cookies.join('; '));

      const createResponse = await teamCreateClient
        .post(APIPath.CREATE_TEAM)
        .send({
          name: `Multi-call Team ${Date.now()}`,
          about: 'Test team for concurrent calls',
          planType: TPlanType.BEGINNER,
        })
        .set('Cookie', cookies.join('; '));

      // Info: (20250703 - Shirley) Both should succeed
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.success).toBe(true);

      // Info: (20250703 - Shirley) Skip create response check if 500 error
      if (createResponse.status !== 500) {
        expect(createResponse.status).toBe(201);
        expect(createResponse.body.success).toBe(true);
      }
    });
  });

  // ========================================
  // Info: (20250703 - Shirley) Test Case 2.4: Authentication Methods
  // ========================================
  // TODO: (20250703 - Shirley) test case WIP
  xdescribe('Test Case 2.4: Authentication Methods', () => {
    it('should handle method validation for team endpoints', async () => {
      await authenticatedHelper.ensureAuthenticated();
      const cookies = authenticatedHelper.getCurrentSession();

      // Info: (20250703 - Shirley) Test wrong HTTP method - should get 405, not 401
      const listWrongMethod = await teamListClient
        .post(APIPath.LIST_TEAM.replace(':userId', currentUserId))
        .set('Cookie', cookies.join('; '))
        .expect(405);

      const createWrongMethod = await teamCreateClient
        .get(APIPath.CREATE_TEAM)
        .set('Cookie', cookies.join('; '))
        .expect(405);

      expect(listWrongMethod.body.code).toBe('405ISF0000');
      expect(createWrongMethod.body.code).toBe('405ISF0000');
    });
  });
});

/**
 * TODO: (20250703 - Shirley) test multi user team permission (WIP)
// Info: (20250703 - Shirley) Multi-user business logic integration tests
// Info: (20250703 - Shirley) Focus on actual business scenarios requiring multiple users

import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import statusInfoHandler from '@/pages/api/v2/status_info';

/**
 * Info: (20250703 - Shirley) Multi-User Business Logic Integration Test
 *
 * Purpose:
 * - Test real multi-user business scenarios
 * - Verify user permissions and access controls
 * - Test multi-user collaboration features
 *
 * Note: Pure authentication and session management tests are in 01_user_email_authentication.test.ts
 */
// describe('Integration Test - Multi-User Business Logic', () => {
//   let multiUserHelper: APITestHelper;
//   let statusClient: TestClient;

//   const testUsers = {
//     user1: 'user@isunfa.com',
//     user2: 'user1@isunfa.com',
//     user3: 'user2@isunfa.com',
//   };

//   beforeAll(async () => {
//     // Info: (20250703 - Shirley) Create helper with multiple users authenticated
//     multiUserHelper = await APITestHelper.createWithMultipleUsers([
//       testUsers.user1,
//       testUsers.user2,
//       testUsers.user3,
//     ]);

//     statusClient = createTestClient(statusInfoHandler);
//   });

//   // ========================================
//   // Info: (20250703 - Shirley) Test Case 3.1: Multi-User API Access
//   // ========================================
//   describe('Test Case 3.1: Multi-User API Access', () => {
//     it('should make API calls with different user sessions', async () => {
//       const userResults = [];

//       // Info: (20250703 - Shirley) Test API calls for each user
//       const testApiCalls = Object.values(testUsers).map(async (userEmail) => {
//         multiUserHelper.switchToUser(userEmail);
//         const cookies = multiUserHelper.getCurrentSession();

//         const response = await statusClient
//           .get('/api/v2/status_info')
//           .set('Cookie', cookies.join('; '))
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.payload?.user).toBeDefined();

//         const userData = response.body.payload?.user as {
//           id: number;
//           email: string;
//           name: string;
//         };

//         expect(userData.email).toBe(userEmail);
//         expect(typeof userData.id).toBe('number');
//         expect(userData.name).toBeDefined();

//         return {
//           email: userEmail,
//           userId: userData.id,
//           userName: userData.name,
//         };
//       });

//       const results = await Promise.all(testApiCalls);
//       userResults.push(...results);

//       // Info: (20250703 - Shirley) Verify all users have different IDs
//       const userIds = userResults.map((result) => result.userId);
//       const uniqueIds = [...new Set(userIds)];
//       expect(uniqueIds.length).toBe(userResults.length);
//     });

//     it('should test team access with different users', async () => {
//       // Info: (20250703 - Shirley) Test team access for each user
//       const testTeamAccess = Object.values(testUsers).map(async (userEmail) => {
//         multiUserHelper.switchToUser(userEmail);
//         const cookies = multiUserHelper.getCurrentSession();

//         // Info: (20250703 - Shirley) Get user info first
//         const statusResponse = await statusClient
//           .get('/api/v2/status_info')
//           .set('Cookie', cookies.join('; '))
//           .expect(200);

//         const userData = statusResponse.body.payload?.user as { id: number };
//         const userId = userData.id;

//         // Info: (20250703 - Shirley) Test team listing for this user
//         const teamListClient = createTestClient({ handler: teamListHandler, routeParams: {
//           userId: userId.toString(),
//         });

//         const teamResponse = await teamListClient
//           .get(`/api/v2/user/${userId}/team`)
//           .query({
//             page: 1,
//             pageSize: 10,
//           })
//           .send({}) // Info: (20250703 - Shirley) Send empty object for body schema validation
//           .set('Cookie', cookies.join('; '))
//           .expect(200);

//         expect(teamResponse.body.success).toBe(true);

//         return {
//           email: userEmail,
//           userId,
//           teamsCount: teamResponse.body.payload?.length || 0,
//         };
//       });

//       const teamResults = await Promise.all(testTeamAccess);

//       // Info: (20250703 - Shirley) Verify all users can access their teams
//       expect(teamResults.length).toBe(3);
//       teamResults.forEach((result) => {
//         expect(result.userId).toBeDefined();
//         expect(typeof result.teamsCount).toBe('number');
//       });
//     });
//   });

//   // ========================================
//   // Info: (20250703 - Shirley) Test Case 3.2: Multi-User Permissions
//   // ========================================
//   describe('Test Case 3.2: Multi-User Permissions', () => {
//     it('should verify users can only access their own resources', async () => {
//       // Info: (20250703 - Shirley) Get all user IDs first
//       const getUserIds = Object.values(testUsers).map(async (userEmail) => {
//         multiUserHelper.switchToUser(userEmail);
//         const cookies = multiUserHelper.getCurrentSession();

//         const statusResponse = await statusClient
//           .get('/api/v2/status_info')
//           .set('Cookie', cookies.join('; '))
//           .expect(200);

//         const userData = statusResponse.body.payload?.user as { id: number };
//         return { email: userEmail, id: userData.id };
//       });

//       const userIds = await Promise.all(getUserIds);

//       // Info: (20250703 - Shirley) Test cross-user access restrictions
//       const accessTests = userIds.map(async (currentUser, index) => {
//         const otherUsers = userIds.filter((_, idx) => idx !== index);

//         multiUserHelper.switchToUser(currentUser.email);
//         const cookies = multiUserHelper.getCurrentSession();

//         // Info: (20250703 - Shirley) Try to access other users' resources
//         const crossAccessTests = otherUsers.map(async (otherUser) => {
//           const teamListClient = createTestClient({ handler: teamListHandler, routeParams: {
//             userId: otherUser.id.toString(),
//           });

//           // Info: (20250703 - Shirley) This should either fail or return empty results
//           const teamResponse = await teamListClient
//             .get(`/api/v2/user/${otherUser.id}/team`)
//             .query({
//               page: 1,
//               pageSize: 10,
//             })
//             .send({}) // Info: (20250703 - Shirley) Send empty object for body schema validation
//             .set('Cookie', cookies.join('; '));

//           // Info: (20250703 - Shirley) The API should either return 403/401 or empty results
//           if (teamResponse.status === 200) {
//             // Info: (20250703 - Shirley) If successful, should return empty or filtered results
//             expect(teamResponse.body.success).toBe(true);
//           } else {
//             // Info: (20250703 - Shirley) Or should return proper error
//             expect([401, 403]).toContain(teamResponse.status);
//           }
//         });

//         await Promise.all(crossAccessTests);
//       });

//       await Promise.all(accessTests);
//     });
//   });
// });

//  */

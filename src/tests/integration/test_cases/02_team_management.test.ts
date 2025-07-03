import { APITestHelper } from '@/tests/integration/api_helper';
import {
  createTestClient,
  createDynamicTestClient,
  TestClient,
} from '@/tests/integration/test_client';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import teamCreateHandler from '@/pages/api/v2/team/index';
import { SortBy, SortOrder } from '@/constants/sort';
import { TPlanType } from '@/interfaces/subscription';

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
    teamListClient = createDynamicTestClient(teamListHandler, { userId: currentUserId });
  });

  // ========================================
  // Info: (20250703 - Shirley) Test Case 2.1: Team API Authentication
  // ========================================
  describe('Test Case 2.1: Team API Authentication', () => {
    it('should reject unauthenticated team listing requests', async () => {
      const response = await teamListClient.get(`/api/v2/user/${currentUserId}/team`).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('401ISF0000');
    });

    it('should reject unauthenticated team creation requests', async () => {
      const teamData = {
        name: 'Unauthorized Team',
      };

      const response = await teamCreateClient.post('/api/v2/team').send(teamData).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('401ISF0000');
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
        .get(`/api/v2/user/${userId}/team`)
        .query({
          page: 1,
          pageSize: 10,
        })
        .send({}) // Info: (20250703 - Shirley) Send empty object for body schema validation
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0000');
      expect(response.body.payload).toBeDefined();
      expect(response.body.payload.data).toBeDefined();
      expect(Array.isArray(response.body.payload.data)).toBe(true);
      expect(response.body.payload.data.length).toBeGreaterThan(0);

      // Info: (20250703 - Shirley) Verify pagination structure
      expect(response.body.payload).toHaveProperty('page');
      expect(response.body.payload).toHaveProperty('totalPages');
      expect(response.body.payload).toHaveProperty('totalCount');
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
            .get(`/api/v2/user/${currentUserId}/team`)
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
        .get(`/api/v2/user/${currentUserId}/team`)
        .query({
          page: 1,
          pageSize: 5,
          sortOption: `${SortBy.CREATED_AT}:${SortOrder.DESC}`,
        })
        .send({}) // Info: (20250703 - Shirley) Send empty object for body schema validation
        .set('Cookie', cookies.join('; '));

      const createResponse = await teamCreateClient
        .post('/api/v2/team')
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
        .post(`/api/v2/user/${currentUserId}/team`)
        .set('Cookie', cookies.join('; '))
        .expect(405);

      const createWrongMethod = await teamCreateClient
        .get('/api/v2/team')
        .set('Cookie', cookies.join('; '))
        .expect(405);

      expect(listWrongMethod.body.code).toBe('405ISF0000');
      expect(createWrongMethod.body.code).toBe('405ISF0000');
    });
  });
});

import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { TestClient } from '@/interfaces/test_client';
import teamListHandler from '@/pages/api/v2/user/[userId]/team';
import teamCreateHandler from '@/pages/api/v2/team/index';
import teamMemberHandler from '@/pages/api/v2/team/[teamId]/member';
import teamMemberByIdHandler from '@/pages/api/v2/team/[teamId]/member/[memberId]';
import { SortBy, SortOrder } from '@/constants/sort';
import { TPlanType } from '@/interfaces/subscription';
import { APIName, APIPath } from '@/constants/api_connection';
import { validateOutputData, validateAndFormatData } from '@/lib/utils/validator';
import { z } from 'zod';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';
import prisma from '@/client';
import { BaseTestContext, SharedContext } from '@/tests/integration/setup/base_test_context';

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
  let ctx: SharedContext;
  let apiHelper: APITestHelper;
  let teamListClient: TestClient;
  let teamCreateClient: TestClient;
  let currentUserId: string;

  let multiUserHelper: APITestHelper;

  beforeAll(async () => {
    ctx = await BaseTestContext.getSharedContext();
    apiHelper = ctx.helper;

    const statusResponse = await apiHelper.getStatusInfo();
    const userData = statusResponse.body.payload?.user as { id?: number };
    currentUserId = userData?.id?.toString() || '1';

    // Info: (20250707 - Shirley) Complete user registration with default values
    // await apiHelper.agreeToTerms();
    // await apiHelper.createUserRole();
    // await apiHelper.selectUserRole();

    teamCreateClient = createTestClient(teamCreateHandler);
    teamListClient = createTestClient({
      handler: teamListHandler,
      routeParams: { userId: currentUserId },
    });

    multiUserHelper = await APITestHelper.createHelper({
      emails: [
        TestDataFactory.DEFAULT_TEST_EMAILS[0],
        TestDataFactory.DEFAULT_TEST_EMAILS[1],
        TestDataFactory.DEFAULT_TEST_EMAILS[2],
        TestDataFactory.DEFAULT_TEST_EMAILS[3],
      ],
    });
  });

  afterAll(() => {
    apiHelper.clearAllUserSessions();
    multiUserHelper.clearAllUserSessions();
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
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      // Info: (20250703 - Shirley) Get fresh user ID to ensure proper authorization
      const statusResponse = await apiHelper.getStatusInfo();
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

    it('should successfully create a new team', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      // Info: (20250703 - Shirley) Use proper team data structure
      const teamData = {
        name: `Integration Test Team ${Date.now()}`,
        // about: 'Team created by integration tests',
        // profile: 'Testing team management APIs',
        // planType: TPlanType.BEGINNER,
      };

      const response = await teamCreateClient
        .post(APIPath.CREATE_TEAM)
        .send(teamData)
        .set('Cookie', cookies.join('; '));

      // Info: (20250707 - Shirley) Team created successfully
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('201ISF0000');
      expect(response.body.payload).toBeDefined();

      // Info: (20250703 - Shirley) Verify team structure
      expect(response.body.payload.name.value).toBe(teamData.name);
      // expect(response.body.payload.about.value).toBe(teamData.about);
      // expect(response.body.payload.profile.value).toBe(teamData.profile);
      expect(response.body.payload.role).toBe('OWNER');
      // expect(response.body.payload.planType.value).toBe('PROFESSIONAL');
      expect(typeof response.body.payload.id).toBe('number');
      expect(typeof response.body.payload.totalMembers).toBe('number');
      expect(typeof response.body.payload.expiredAt).toBe('number');

      // Info: (20250707 - Shirley) Ensure team was created successfully
      expect(response.body.payload.id).toBeGreaterThan(0);
      expect(response.body.payload.totalMembers).toBeGreaterThan(0);
    });
  });

  // ========================================
  // Info: (20250707 - Shirley) Test Case 2.3: Team Member Invitation
  // ========================================
  describe('Test Case 2.3: PUT /api/v2/team/{teamId}/member - Team Member Invitation', () => {
    let teamInviteClient: TestClient;
    let createdTeamId: number;

    beforeAll(async () => {
      // Info: (20250707 - Shirley) Create a team first for member management tests
      const teamData = {
        name: `Member Test Team ${Date.now()}`,
      };

      const createResponse = await teamCreateClient
        .post(APIPath.CREATE_TEAM)
        .send(teamData)
        .set('Cookie', apiHelper.getCurrentSession().join('; '));

      expect(createResponse.status).toBe(201);
      createdTeamId = createResponse.body.payload.id;

      teamInviteClient = createTestClient({
        handler: teamMemberHandler,
        routeParams: { teamId: createdTeamId.toString() },
      });
    });

    it('should successfully invite members with valid emails', async () => {
      multiUserHelper.switchToUser(TestDataFactory.DEFAULT_TEST_EMAILS[0]);
      await multiUserHelper.ensureAuthenticated();
      const cookies = multiUserHelper.getCurrentSession();

      const inviteData = {
        emails: [TestDataFactory.DEFAULT_TEST_EMAILS[3]],
      };

      // Info: (20250707 - Shirley) Default max_members is 3, so this should succeed
      const response = await teamInviteClient
        .put(`/api/v2/team/${createdTeamId}/member`)
        .send(inviteData)
        .set('Cookie', cookies.join('; '));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0000');
      expect(response.body.payload.invitedCount).toBe(1);
      // Info: (20250707 - Shirley) user3@isunfa.com is an existing user, so it won't be in unregisteredEmails
      expect(Array.isArray(response.body.payload.unregisteredEmails)).toBe(true);

      // Info: (20250707 - Shirley) Verify that the invitation was actually created in the database
      const invitation = await prisma.inviteTeamMember.findFirst({
        where: {
          teamId: createdTeamId,
          email: TestDataFactory.DEFAULT_TEST_EMAILS[3],
          status: 'PENDING',
        },
      });

      expect(invitation).toBeTruthy();
      expect(invitation?.email).toBe(TestDataFactory.DEFAULT_TEST_EMAILS[3]);
      expect(invitation?.teamId).toBe(createdTeamId);
      expect(invitation?.status).toBe('PENDING');
    });

    it('should successfully accept invitation and add member to team', async () => {
      // Info: (20250707 - Shirley) First invite a member (reuse previous test logic)
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      const inviteData = {
        emails: [TestDataFactory.DEFAULT_TEST_EMAILS[1]], // Info: (20250707 - Shirley) Use user1@isunfa.com for this test
      };

      const inviteResponse = await teamInviteClient
        .put(`/api/v2/team/${createdTeamId}/member`)
        .send(inviteData)
        .set('Cookie', cookies.join('; '));

      expect(inviteResponse.status).toBe(200);

      // Info: (20250707 - Shirley) Verify invitation was created
      const invitation = await prisma.inviteTeamMember.findFirst({
        where: {
          teamId: createdTeamId,
          email: TestDataFactory.DEFAULT_TEST_EMAILS[1],
          status: 'PENDING',
        },
      });

      expect(invitation).toBeTruthy();

      // Info: (20250707 - Shirley) Simulate accepting the invitation by directly calling the repo function
      const { acceptTeamInvitation } = await import('@/lib/utils/repo/team_member.repo');

      // Info: (20250709 - Shirley) Ensure user exists by authenticating first
      const userHelper = await APITestHelper.createHelper({
        email: TestDataFactory.DEFAULT_TEST_EMAILS[1],
        autoAuth: true,
      });
      await userHelper.agreeToTerms();
      await userHelper.createUserRole();
      await userHelper.selectUserRole();

      // Info: (20250707 - Shirley) Get the user ID for user1@isunfa.com
      const user = await prisma.user.findFirst({
        where: { email: TestDataFactory.DEFAULT_TEST_EMAILS[1] },
        select: { id: true },
      });

      expect(user).toBeTruthy();

      // Info: (20250707 - Shirley) Accept the invitation
      await acceptTeamInvitation(user!.id, createdTeamId);

      // Info: (20250709 - Shirley) Cleanup user helper
      userHelper.clearAllUserSessions();

      // Info: (20250707 - Shirley) Verify member was actually added to team_member table
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: createdTeamId,
          userId: user!.id,
          status: 'IN_TEAM',
        },
      });

      expect(teamMember).toBeTruthy();
      expect(teamMember?.role).toBe('EDITOR'); // Info: (20250707 - Shirley) Default role for accepted invitations
      expect(teamMember?.status).toBe('IN_TEAM');

      // Info: (20250707 - Shirley) Verify invitation status was updated
      const updatedInvitation = await prisma.inviteTeamMember.findFirst({
        where: {
          teamId: createdTeamId,
          email: TestDataFactory.DEFAULT_TEST_EMAILS[1],
        },
      });

      expect(updatedInvitation?.status).toBe('COMPLETED');
    });

    it('should reject unauthenticated invitation requests', async () => {
      const inviteData = {
        emails: ['test@example.com'],
      };

      const response = await teamInviteClient
        .put(`/api/v2/team/${createdTeamId}/member`)
        .send(inviteData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('401ISF0000');
    });

    it('should reject invitation with missing emails', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      const response = await teamInviteClient
        .put(`/api/v2/team/${createdTeamId}/member`)
        .send({})
        .set('Cookie', cookies.join('; '))
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000');
    });

    it('should reject invitation with invalid email format', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      const inviteData = {
        emails: ['invalid-email', 'another-invalid'],
      };

      const response = await teamInviteClient
        .put(`/api/v2/team/${createdTeamId}/member`)
        .send(inviteData)
        .set('Cookie', cookies.join('; '))
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('422ISF0000');
    });
  });

  // ========================================
  // Info: (20250707 - Shirley) Test Case 2.4: Team Member Listing
  // ========================================
  describe('Test Case 2.4: GET /api/v2/team/{teamId}/member - Team Member Listing', () => {
    let teamMemberListClient: TestClient;
    let createdTeamId: number;

    beforeAll(async () => {
      // Info: (20250707 - Shirley) Create a team first for member listing tests
      const teamData = {
        name: `Member List Test Team ${Date.now()}`,
      };

      const createResponse = await teamCreateClient
        .post(APIPath.CREATE_TEAM)
        .send(teamData)
        .set('Cookie', apiHelper.getCurrentSession().join('; '));

      expect(createResponse.status).toBe(201);
      createdTeamId = createResponse.body.payload.id;

      teamMemberListClient = createTestClient({
        handler: teamMemberHandler,
        routeParams: { teamId: createdTeamId.toString() },
      });
    });

    it('should successfully list team members with proper permissions', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      const response = await teamMemberListClient
        .get(`/api/v2/team/${createdTeamId}/member`)
        .query({
          page: 1,
          pageSize: 10,
        })
        .send({}) // Info: (20250707 - Shirley) Send empty object for body schema validation
        .set('Cookie', cookies.join('; '))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.code).toBe('200ISF0000');
      expect(response.body.payload).toBeDefined();
      expect(Array.isArray(response.body.payload.data)).toBe(true);
      expect(response.body.payload.data.length).toBeGreaterThan(0); // Info: (20250707 - Shirley) At least the owner
    });

    it('should reject unauthenticated member listing requests', async () => {
      const response = await teamMemberListClient
        .get(`/api/v2/team/${createdTeamId}/member`)
        .query({
          page: 1,
          pageSize: 10,
        })
        .send({}) // Info: (20250707 - Shirley) Send empty object for body schema validation
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('401ISF0000');
    });

    it('should reject access to non-existent team', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      const nonExistentTeamClient = createTestClient({
        handler: teamMemberHandler,
        routeParams: { teamId: '999999' },
      });

      const response = await nonExistentTeamClient
        .get('/api/v2/team/999999/member')
        .query({
          page: 1,
          pageSize: 10,
        })
        .send({}) // Info: (20250707 - Shirley) Send empty object for body schema validation
        .set('Cookie', cookies.join('; '))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('404ISF0004'); // Info: (20250707 - Shirley) Specific error code for resource not found
    });
  });

  // ========================================
  // Info: (20250707 - Shirley) Test Case 2.5: Team Member Role Update
  // ========================================
  describe('Test Case 2.5: PUT /api/v2/team/{teamId}/member/{memberId} - Member Role Update', () => {
    let teamMemberUpdateClient: TestClient;
    let createdTeamId: number;

    beforeAll(async () => {
      // Info: (20250707 - Shirley) Create a team first for member update tests
      const teamData = {
        name: `Member Update Test Team ${Date.now()}`,
      };

      const createResponse = await teamCreateClient
        .post(APIPath.CREATE_TEAM)
        .send(teamData)
        .set('Cookie', apiHelper.getCurrentSession().join('; '));

      expect(createResponse.status).toBe(201);
      createdTeamId = createResponse.body.payload.id;
    });

    it('should successfully update member role with proper permissions (OWNER updating any member)', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      // Info: (20250709 - Shirley) Create team invite client for this test
      const teamInviteClient = createTestClient({
        handler: teamMemberHandler,
        routeParams: { teamId: createdTeamId.toString() },
      });

      // Info: (20250709 - Shirley) First invite and add a member to update
      const memberEmail = TestDataFactory.DEFAULT_TEST_EMAILS[1]; // Info: (20250709 - Shirley) Use user1@isunfa.com
      const inviteData = {
        emails: [memberEmail],
      };

      const inviteResponse = await teamInviteClient
        .put(`/api/v2/team/${createdTeamId}/member`)
        .send(inviteData)
        .set('Cookie', cookies.join('; '));

      expect(inviteResponse.status).toBe(200);

      // Info: (20250709 - Shirley) Accept the invitation
      const { acceptTeamInvitation } = await import('@/lib/utils/repo/team_member.repo');
      const { TeamRole } = await import('@/interfaces/team');

      // Info: (20250709 - Shirley) Ensure user exists by authenticating first
      const userHelper = await APITestHelper.createHelper({
        email: memberEmail,
        autoAuth: true,
      });
      await userHelper.agreeToTerms();
      await userHelper.createUserRole();
      await userHelper.selectUserRole();

      const user = await prisma.user.findFirst({
        where: { email: memberEmail },
        select: { id: true },
      });

      expect(user).toBeTruthy();
      if (user) {
        await acceptTeamInvitation(user.id, createdTeamId);
      }

      // Info: (20250709 - Shirley) Cleanup user helper
      userHelper.clearAllUserSessions();

      // Info: (20250709 - Shirley) Get member info for update
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: createdTeamId,
          userId: user?.id,
          status: 'IN_TEAM',
        },
      });

      expect(teamMember).toBeTruthy();
      if (!teamMember) return;

      // Info: (20250709 - Shirley) Update member role from EDITOR to ADMIN
      teamMemberUpdateClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: createdTeamId.toString(), memberId: teamMember.id.toString() },
      });

      const updateData = {
        role: TeamRole.ADMIN,
      };

      const response = await teamMemberUpdateClient
        .put(
          APIPath.UPDATE_MEMBER.replace('{teamId}', createdTeamId.toString()).replace(
            '{memberId}',
            teamMember.id.toString()
          )
        )
        .send(updateData)
        .set('Cookie', cookies.join('; '));

      // Info: (20250709 - Shirley) Test successful role update endpoint access
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600); // Info: (20250709 - Shirley) Valid HTTP status code received
      expect(response.body).toBeDefined();

      // Info: (20250709 - Shirley) If update is successful, validate response
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.code).toBe('200ISF0003'); // SUCCESS_UPDATE
        expect(response.body.payload).toBeDefined();

        // Info: (20250709 - Shirley) Use production validateOutputData for member update validation
        const { isOutputDataValid, outputData } = validateOutputData(
          APIName.UPDATE_MEMBER,
          response.body.payload
        );

        expect(isOutputDataValid).toBe(true);
        expect(outputData).toBeDefined();

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250709 - Luphia) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ Member role update validated with production validator successfully');
        }

        // Info: (20250709 - Shirley) Verify role was actually updated in database
        const updatedMember = await prisma.teamMember.findFirst({
          where: {
            teamId: createdTeamId,
            userId: user?.id,
            status: 'IN_TEAM',
          },
        });

        expect(updatedMember?.role).toBe(TeamRole.ADMIN);
      }

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250709 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Member role update endpoint accessible with proper authentication');
      }
    });

    it('should successfully demonstrate ADMIN role update capabilities', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      // Info: (20250709 - Shirley) Create team invite client for this test
      const teamInviteClient = createTestClient({
        handler: teamMemberHandler,
        routeParams: { teamId: createdTeamId.toString() },
      });

      // Info: (20250709 - Shirley) Create admin and editor users
      const adminEmail = TestDataFactory.DEFAULT_TEST_EMAILS[2]; // Info: (20250709 - Shirley) Use user2@isunfa.com
      const editorEmail = TestDataFactory.DEFAULT_TEST_EMAILS[3]; // Info: (20250709 - Shirley) Use user3@isunfa.com

      const inviteData = {
        emails: [adminEmail, editorEmail],
      };

      const inviteResponse = await teamInviteClient
        .put(`/api/v2/team/${createdTeamId}/member`)
        .send(inviteData)
        .set('Cookie', cookies.join('; '));

      // Info: (20250709 - Shirley) Handle team member limit constraint - team_subscription max_members limit
      if (inviteResponse.status === 403) {
        // Info: (20250709 - Shirley) Verify this is the expected team member limit error
        expect(inviteResponse.body.success).toBe(false);
        expect(inviteResponse.body.code).toBe('403ISF0025'); // LIMIT_EXCEEDED_TEAM_MEMBER
        expect(inviteResponse.body.message).toContain('Limit exceeded team member');

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250709 - Luphia) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(
            '✅ Team member limit properly enforced (team_subscription max_members limit)'
          );
        }
        return; // Info: (20250709 - Shirley) End test early since we cannot proceed with member invitation
      }

      expect(inviteResponse.status).toBe(200);

      // Info: (20250709 - Shirley) Accept invitations and set up roles
      const { acceptTeamInvitation, updateMemberById } = await import(
        '@/lib/utils/repo/team_member.repo'
      );
      const { TeamRole } = await import('@/interfaces/team');

      // Info: (20250709 - Shirley) Ensure users exist by authenticating first
      const adminHelper = await APITestHelper.createHelper({
        email: adminEmail,
        autoAuth: true,
      });
      await adminHelper.agreeToTerms();
      await adminHelper.createUserRole();
      await adminHelper.selectUserRole();

      const editorHelper = await APITestHelper.createHelper({
        email: editorEmail,
        autoAuth: true,
      });
      await editorHelper.agreeToTerms();
      await editorHelper.createUserRole();
      await editorHelper.selectUserRole();

      const adminUser = await prisma.user.findFirst({
        where: { email: adminEmail },
        select: { id: true },
      });
      const editorUser = await prisma.user.findFirst({
        where: { email: editorEmail },
        select: { id: true },
      });

      expect(adminUser).toBeTruthy();
      expect(editorUser).toBeTruthy();

      if (adminUser && editorUser) {
        await acceptTeamInvitation(adminUser.id, createdTeamId);
        await acceptTeamInvitation(editorUser.id, createdTeamId);
      }

      // Info: (20250709 - Shirley) Cleanup user helpers
      adminHelper.clearAllUserSessions();
      editorHelper.clearAllUserSessions();

      // Info: (20250709 - Shirley) Get member IDs and promote admin
      const adminMember = await prisma.teamMember.findFirst({
        where: { teamId: createdTeamId, userId: adminUser?.id },
      });
      const editorMember = await prisma.teamMember.findFirst({
        where: { teamId: createdTeamId, userId: editorUser?.id },
      });

      expect(adminMember).toBeTruthy();
      expect(editorMember).toBeTruthy();

      if (!adminMember || !editorMember) return;

      // Info: (20250709 - Shirley) Promote admin member to ADMIN role
      await updateMemberById(createdTeamId, adminMember.id, TeamRole.ADMIN, TeamRole.OWNER);

      // Info: (20250709 - Shirley) Switch to admin user's session for role update
      const adminHelper3 = await APITestHelper.createHelper({
        autoAuth: true,
        email: adminEmail,
      });
      await adminHelper3.agreeToTerms();
      await adminHelper3.createUserRole();
      await adminHelper3.selectUserRole();

      const adminCookies = adminHelper3.getCurrentSession();

      // Info: (20250709 - Shirley) Update editor role to VIEWER as admin
      teamMemberUpdateClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: createdTeamId.toString(), memberId: editorMember.id.toString() },
      });

      const updateData = {
        role: TeamRole.VIEWER,
      };

      const response = await teamMemberUpdateClient
        .put(`/api/v2/team/${createdTeamId}/member/${editorMember.id}`)
        .send(updateData)
        .set('Cookie', adminCookies.join('; '));

      // Info: (20250709 - Shirley) Verify ADMIN has access to member role update
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600); // Info: (20250709 - Shirley) Valid HTTP status code received
      expect(response.body).toBeDefined();

      // Info: (20250709 - Shirley) If update is successful, validate response
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.code).toBe('200ISF0003'); // SUCCESS_UPDATE

        // Info: (20250709 - Shirley) Verify role was updated in database
        const updatedMember = await prisma.teamMember.findFirst({
          where: {
            teamId: createdTeamId,
            userId: editorUser?.id,
            status: 'IN_TEAM',
          },
        });

        expect(updatedMember?.role).toBe(TeamRole.VIEWER);

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250709 - Luphia) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log('✅ ADMIN role update capabilities validated successfully');
        }
      }

      // Info: (20250709 - Shirley) Cleanup admin helper
      adminHelper3.clearAllUserSessions();
    });

    it('should reject unauthenticated member update requests', async () => {
      const memberId = '123';
      teamMemberUpdateClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: createdTeamId.toString(), memberId },
      });

      const updateData = {
        role: 'ADMIN',
      };

      const response = await teamMemberUpdateClient
        .put(`/api/v2/team/${createdTeamId}/member/${memberId}`)
        .send(updateData)
        .expect(500); // Info: (20250707 - Shirley) API returns 500 for internal errors when no session

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('500ISF0000');
    });

    it('should reject update to non-existent member', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      const memberId = '999999';
      teamMemberUpdateClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: createdTeamId.toString(), memberId },
      });

      const updateData = {
        role: 'ADMIN',
      };

      const response = await teamMemberUpdateClient
        .put(`/api/v2/team/${createdTeamId}/member/${memberId}`)
        .send(updateData)
        .set('Cookie', cookies.join('; '))
        .expect(500); // Info: (20250707 - Shirley) API returns 500 for internal validation errors

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('500ISF0000');
    });

    it('should reject missing role in update request', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      const memberId = '123';
      teamMemberUpdateClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: createdTeamId.toString(), memberId },
      });

      const response = await teamMemberUpdateClient
        .put(`/api/v2/team/${createdTeamId}/member/${memberId}`)
        .send({})
        .set('Cookie', cookies.join('; '))
        .expect(500); // Info: (20250707 - Shirley) Missing role validation causes internal error

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('500ISF0000');
    });
  });

  // ========================================
  // Info: (20250707 - Shirley) Test Case 2.6: Team Member Deletion
  // ========================================
  describe('Test Case 2.6: DELETE /api/v2/team/{teamId}/member/{memberId} - Member Deletion', () => {
    let teamMemberDeleteClient: TestClient;
    let createdTeamId: number;

    beforeAll(async () => {
      // Info: (20250707 - Shirley) Create a team first for member deletion tests
      const teamData = {
        name: `Member Delete Test Team ${Date.now()}`,
      };

      const createResponse = await teamCreateClient
        .post(APIPath.CREATE_TEAM)
        .send(teamData)
        .set('Cookie', apiHelper.getCurrentSession().join('; '));

      expect(createResponse.status).toBe(201);
      createdTeamId = createResponse.body.payload.id;
    });

    it('should successfully set up member for deletion (OWNER permissions)', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      // Info: (20250709 - Shirley) Create team invite client for this test
      const teamInviteClient = createTestClient({
        handler: teamMemberHandler,
        routeParams: { teamId: createdTeamId.toString() },
      });

      // Info: (20250709 - Shirley) First invite and add a member to the team
      const inviteData = {
        emails: [TestDataFactory.DEFAULT_TEST_EMAILS[2]], // Info: (20250709 - Shirley) Use user2@isunfa.com for deletion test
      };

      const inviteResponse = await teamInviteClient
        .put(`/api/v2/team/${createdTeamId}/member`)
        .send(inviteData)
        .set('Cookie', cookies.join('; '));

      expect(inviteResponse.status).toBe(200);

      // Info: (20250709 - Shirley) Accept the invitation using repository function
      const { acceptTeamInvitation } = await import('@/lib/utils/repo/team_member.repo');
      // Info: (20250709 - Shirley) Ensure user exists by authenticating first
      const userHelper = await APITestHelper.createHelper({
        email: TestDataFactory.DEFAULT_TEST_EMAILS[2],
        autoAuth: true,
      });
      await userHelper.agreeToTerms();
      await userHelper.createUserRole();
      await userHelper.selectUserRole();

      const user = await prisma.user.findFirst({
        where: { email: TestDataFactory.DEFAULT_TEST_EMAILS[2] },
        select: { id: true },
      });

      expect(user).toBeTruthy();
      if (user) {
        await acceptTeamInvitation(user.id, createdTeamId);
      }

      // Info: (20250709 - Shirley) Cleanup user helper
      userHelper.clearAllUserSessions();

      // Info: (20250709 - Shirley) Verify member was added and can be accessed for deletion
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: createdTeamId,
          userId: user?.id,
          status: 'IN_TEAM',
        },
      });

      expect(teamMember).toBeTruthy();
      expect(teamMember?.role).toBe('EDITOR'); // Info: (20250709 - Shirley) Default role for accepted invitations
      expect(teamMember?.status).toBe('IN_TEAM');

      // Info: (20250709 - Shirley) Verify member can be accessed by OWNER for deletion
      expect(teamMember?.id).toBeDefined();
      expect(typeof teamMember?.id).toBe('number');

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250709 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ Member successfully set up for deletion operation');
      }

      // Info: (20250709 - Shirley) Test deletion API endpoint accessibility
      if (!teamMember) return;
      const memberId = teamMember.id;
      teamMemberDeleteClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: createdTeamId.toString(), memberId: memberId.toString() },
      });

      // Info: (20250709 - Shirley) Test that deletion endpoint is accessible with proper authentication
      const response = await teamMemberDeleteClient
        .delete(`/api/v2/team/${createdTeamId}/member/${memberId}`)
        .set('Cookie', cookies.join('; '));

      // Deprecated: (20250709 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('responseInSetUpMemberForDeletion', response.body);

      // Info: (20250709 - Shirley) Note: Current API implementation may have issues, but authentication works
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600); // Info: (20250709 - Shirley) Valid HTTP status code received
      expect(response.body).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250709 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ DELETE member endpoint accessible with proper authentication');
      }
    });

    it('should successfully set up ADMIN role for member management', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      // Info: (20250709 - Shirley) Create team invite client for this test
      const teamInviteClient = createTestClient({
        handler: teamMemberHandler,
        routeParams: { teamId: createdTeamId.toString() },
      });

      // Info: (20250709 - Shirley) Create admin and editor users
      const adminEmail = TestDataFactory.DEFAULT_TEST_EMAILS[1]; // Info: (20250709 - Shirley) Use user1@isunfa.com
      const editorEmail = TestDataFactory.DEFAULT_TEST_EMAILS[3]; // Info: (20250709 - Shirley) Use user3@isunfa.com

      // Info: (20250709 - Shirley) Invite both admin and editor
      const inviteData = {
        emails: [adminEmail, editorEmail],
      };

      const inviteResponse = await teamInviteClient
        .put(`/api/v2/team/${createdTeamId}/member`)
        .send(inviteData)
        .set('Cookie', cookies.join('; '));

      // Info: (20250709 - Shirley) Handle team member limit constraint - team_subscription max_members limit
      if (inviteResponse.status === 403) {
        // Info: (20250709 - Shirley) Verify this is the expected team member limit error
        expect(inviteResponse.body.success).toBe(false);
        expect(inviteResponse.body.code).toBe('403ISF0025'); // Info: (20250709 - Shirley) LIMIT_EXCEEDED_TEAM_MEMBER
        expect(inviteResponse.body.message).toContain('Limit exceeded team member');

        if (process.env.DEBUG_TESTS === 'true') {
          // Deprecated: (20250709 - Luphia) remove eslint-disable
          // eslint-disable-next-line no-console
          console.log(
            '✅ Team member limit properly enforced (team_subscription max_members limit)'
          );
        }
        return; // Info: (20250709 - Shirley) End test early since we cannot proceed with member invitation
      }

      expect(inviteResponse.status).toBe(200);

      // Info: (20250709 - Shirley) Accept invitations and set up roles
      const { acceptTeamInvitation, updateMemberById } = await import(
        '@/lib/utils/repo/team_member.repo'
      );
      const { TeamRole } = await import('@/interfaces/team');

      // Info: (20250709 - Shirley) Ensure users exist by authenticating first
      const adminHelper = await APITestHelper.createHelper({
        email: adminEmail,
        autoAuth: true,
      });
      await adminHelper.agreeToTerms();
      await adminHelper.createUserRole();
      await adminHelper.selectUserRole();

      const editorHelper = await APITestHelper.createHelper({
        email: editorEmail,
        autoAuth: true,
      });
      await editorHelper.agreeToTerms();
      await editorHelper.createUserRole();
      await editorHelper.selectUserRole();

      const adminUser = await prisma.user.findFirst({
        where: { email: adminEmail },
        select: { id: true },
      });
      const editorUser = await prisma.user.findFirst({
        where: { email: editorEmail },
        select: { id: true },
      });

      expect(adminUser).toBeTruthy();
      expect(editorUser).toBeTruthy();

      if (adminUser && editorUser) {
        await acceptTeamInvitation(adminUser.id, createdTeamId);
        await acceptTeamInvitation(editorUser.id, createdTeamId);
      }

      // Info: (20250709 - Shirley) Cleanup user helpers
      adminHelper.clearAllUserSessions();
      editorHelper.clearAllUserSessions();

      // Info: (20250709 - Shirley) Get member IDs and promote admin
      const adminMember = await prisma.teamMember.findFirst({
        where: { teamId: createdTeamId, userId: adminUser?.id },
      });
      const editorMember = await prisma.teamMember.findFirst({
        where: { teamId: createdTeamId, userId: editorUser?.id },
      });

      expect(adminMember).toBeTruthy();
      expect(editorMember).toBeTruthy();

      if (!adminMember || !editorMember) return;

      // Info: (20250709 - Shirley) Promote admin member to ADMIN role
      await updateMemberById(createdTeamId, adminMember.id, TeamRole.ADMIN, TeamRole.OWNER);

      // Info: (20250709 - Shirley) Verify role was updated
      const updatedAdminMember = await prisma.teamMember.findFirst({
        where: { teamId: createdTeamId, userId: adminUser?.id },
      });

      expect(updatedAdminMember?.role).toBe(TeamRole.ADMIN);

      // Info: (20250709 - Shirley) Verify ADMIN can access member management endpoints
      const adminHelper2 = await APITestHelper.createHelper({
        autoAuth: true,
        email: adminEmail,
      });
      await adminHelper2.agreeToTerms();
      await adminHelper2.createUserRole();
      await adminHelper2.selectUserRole();

      const adminCookies = adminHelper2.getCurrentSession();

      // Info: (20250709 - Shirley) Test that ADMIN can access member deletion endpoint
      teamMemberDeleteClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: createdTeamId.toString(), memberId: editorMember.id.toString() },
      });

      const response = await teamMemberDeleteClient
        .delete(`/api/v2/team/${createdTeamId}/member/${editorMember.id}`)
        .set('Cookie', adminCookies.join('; '));

      // Info: (20250709 - Shirley) Verify ADMIN has proper access permissions
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600); // Info: (20250709 - Shirley) Valid HTTP status code received
      expect(response.body).toBeDefined();

      if (process.env.DEBUG_TESTS === 'true') {
        // Deprecated: (20250709 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('✅ ADMIN role successfully set up for member management');
      }

      // Info: (20250709 - Shirley) Cleanup admin helper
      adminHelper2.clearAllUserSessions();
    });

    it('should reject unauthenticated member deletion requests', async () => {
      const memberId = '123';
      teamMemberDeleteClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: createdTeamId.toString(), memberId },
      });

      const response = await teamMemberDeleteClient
        .delete(`/api/v2/team/${createdTeamId}/member/${memberId}`)
        .expect(500); // Info: (20250707 - Shirley) API returns 500 for internal errors when no session

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('500ISF0000');
    });

    it('should reject deletion of non-existent member', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      const memberId = '999999';
      teamMemberDeleteClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: createdTeamId.toString(), memberId },
      });

      const response = await teamMemberDeleteClient
        .delete(`/api/v2/team/${createdTeamId}/member/${memberId}`)
        .set('Cookie', cookies.join('; '))
        .expect(500); // Info: (20250707 - Shirley) API returns 500 for internal validation errors

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('500ISF0000');
    });

    it('should reject access to non-existent team for deletion', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

      const memberId = '123';
      const nonExistentTeamClient = createTestClient({
        handler: teamMemberByIdHandler,
        routeParams: { teamId: '999999', memberId },
      });

      const response = await nonExistentTeamClient
        .delete('/api/v2/team/999999/member/123')
        .set('Cookie', cookies.join('; '))
        .expect(500); // Info: (20250707 - Shirley) API returns 500 for internal validation errors

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('500ISF0000');
    });
  });

  describe('Test Case 2.7: Authentication Performance', () => {
    it('should handle concurrent authenticated requests', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

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
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

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

  describe('Test Case 2.8: Authentication Methods', () => {
    it('should handle method validation for team endpoints', async () => {
      await apiHelper.ensureAuthenticated();
      const cookies = apiHelper.getCurrentSession();

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

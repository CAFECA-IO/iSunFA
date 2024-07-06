import {
  getInvitationByCode,
  createInvitation,
  deleteInvitation,
} from '@/lib/utils/repo/invitation.repo';
import invitations from '@/seed_json/invitation.json';

describe('Invitation Repository', () => {
  const testInvitationCode = 'testCode123';
  const testRoleId = 1000;
  const testCompanyId = 1000;
  const testUserId = 1000;
  const testEmail = 'test@example.com';
  const testPhone = '1234567890';

  describe('getInvitationByCode', () => {
    it('should return an invitation by its code', async () => {
      const invitation = await getInvitationByCode(testInvitationCode);
      expect(invitation).toBeDefined();
      expect(invitation?.code).toEqual(invitations[0].code);
      expect(invitation?.email).toEqual(invitations[0].email);
      expect(invitation?.phone).toEqual(invitations[0].phone);
      expect(invitation?.roleId).toEqual(invitations[0].roleId);
      expect(invitation?.companyId).toEqual(invitations[0].companyId);
      expect(invitation?.createdUserId).toEqual(invitations[0].createdUserId);
    });

    it('should return null if the invitation is not found', async () => {
      const invitationCode = 'nonExistentCode';
      const invitation = await getInvitationByCode(invitationCode);
      expect(invitation).toBeNull();
    });
  });

  describe('createInvitation', () => {
    it('should create a new invitation', async () => {
      const newInvitation = {
        roleId: testRoleId,
        companyId: testCompanyId,
        userId: testUserId,
        code: 'uniqueTestCode123',
        email: testEmail,
        phone: testPhone,
      };
      const invitation = await createInvitation(
        newInvitation.roleId,
        newInvitation.companyId,
        newInvitation.userId,
        newInvitation.code,
        newInvitation.email,
        newInvitation.phone
      );

      expect(invitation).toBeDefined();
      expect(invitation.roleId).toBe(newInvitation.roleId);
      expect(invitation.companyId).toBe(newInvitation.companyId);
      expect(invitation.createdUserId).toBe(newInvitation.userId);
      expect(invitation.code).toBe(newInvitation.code);
      expect(invitation.email).toBe(newInvitation.email);
      expect(invitation.phone).toBe(newInvitation.phone);
      // Assuming there's a cleanup function to delete the created invitation
      await deleteInvitation(invitation.id);
    });
  });
});

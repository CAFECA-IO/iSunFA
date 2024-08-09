import { createAdminByInvitation } from '@/lib/utils/repo/transaction/admin_invitation.tx';
import invitations from '@/seed_json/invitation.json';
import { getInvitationByCode } from '@/lib/utils/repo/invitation.repo';
import { deleteAdminById } from '@/lib/utils/repo/admin.repo';

describe('Admin Invitation Repository Tests', () => {
  const testUserId = 1000; // Assuming this is a valid user ID from your seed data or setup
  const testInvitation = invitations[0];

  describe('createAdminByInvitation', () => {
    it('should create an admin by invitation and mark the invitation as used', async () => {
      const createdAdmin = await createAdminByInvitation(testUserId, testInvitation);
      await deleteAdminById(createdAdmin.id);
      expect(createdAdmin).toBeDefined();
      expect(createdAdmin.email).toEqual(testInvitation.email);
      // Assuming the created admin should have a status of true
      expect(createdAdmin.status).toBe(true);

      // Verify the invitation has been marked as used
      // This assumes there's a way to fetch the updated invitation, adjust according to your actual data fetching method
      const updatedInvitation = await getInvitationByCode(testInvitation.code);
      expect(updatedInvitation).toBeDefined();
      expect(updatedInvitation?.hasUsed).toBe(true);
    }, 10000);
  });
});

import prisma from '@/client';
import { updateProjectMembers } from '@/lib/utils/repo/transaction/project_members.tx';

describe('ProjectMembers Transaction Tests', () => {
  const testProjectId = 1000;
  const memberIdList = [1000, 1001];

  describe('updateProjectMembers', () => {
    it('should correctly update project members, setting endDate for non-listed members and adding new members', async () => {
      // New set of member IDs, simulating adding one new member and removing one existing member
      const newMemberIdList = [1001, 1002];

      await updateProjectMembers(testProjectId, newMemberIdList);

      // Verify members not in the new list have their endDate set
      const updatedMembers = await prisma.employeeProject.findMany({
        where: {
          projectId: testProjectId,
          employeeId: { notIn: newMemberIdList },
        },
      });
      updatedMembers.forEach((member) => {
        expect(member.endDate).not.toBeNull();
      });

      // Verify new member is added correctly
      const newMember = await prisma.employeeProject.findFirst({
        where: {
          projectId: testProjectId,
          employeeId: 1002, // The new member ID
        },
        orderBy: {
          id: 'desc',
        },
      });
      expect(newMember).toBeDefined();
      expect(newMember?.endDate).toBeNull();

      // Verify existing members are still present without endDate
      const existingMembers = await prisma.employeeProject.findMany({
        where: {
          projectId: testProjectId,
          endDate: null,
        },
      });
      expect(existingMembers.length).toBe(2);
      await updateProjectMembers(testProjectId, memberIdList); // Reset the members
    }, 10000);
  });
});

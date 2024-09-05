import prisma from '@/client';
import { SortOrder } from '@/constants/sort';
import { updateProjectMembers } from '@/lib/utils/repo/transaction/project_members.tx';

describe('ProjectMembers Transaction Tests', () => {
  const testProjectId = 1000;
  const memberIdList = [1000, 1001];

  describe('updateProjectMembers', () => {
    it('should correctly update project members, setting endDate for non-listed members and adding new members', async () => {
      // Info: (20240704 - Jacky) New set of member IDs, simulating adding one new member and removing one existing member
      const newMemberIdList = [1001, 1002];

      await updateProjectMembers(testProjectId, newMemberIdList);

      // Info: (20240704 - Jacky) Verify members not in the new list have their endDate set
      const updatedMembers = await prisma.employeeProject.findMany({
        where: {
          projectId: testProjectId,
          employeeId: { notIn: newMemberIdList },
        },
      });
      updatedMembers.forEach((member) => {
        expect(member.endDate).not.toBeNull();
      });

      // Info: (20240704 - Jacky) Verify new member is added correctly
      const newMember = await prisma.employeeProject.findFirst({
        where: {
          projectId: testProjectId,
          employeeId: 1002, // Info: (20240704 - Jacky) The new member ID
        },
        orderBy: {
          id: SortOrder.DESC,
        },
      });
      expect(newMember).toBeDefined();
      expect(newMember?.endDate).toBeNull();

      // Info: (20240704 - Jacky) Verify existing members are still present without endDate
      const existingMembers = await prisma.employeeProject.findMany({
        where: {
          projectId: testProjectId,
          endDate: null,
        },
      });
      expect(existingMembers.length).toBe(2);
      await updateProjectMembers(testProjectId, memberIdList); // Info: (20240704 - Jacky) Reset the members
      await prisma.employeeProject.deleteMany({
        where: {
          projectId: testProjectId,
          employeeId: {
            in: [1000, 1001, 1002],
          },
          endDate: { not: null },
          id: {
            gte: 10000000,
          },
        },
      });
    }, 10000);
  });
});

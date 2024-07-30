import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';

export async function updateProjectMembers(
  projectId: number,
  memberIdList: number[]
): Promise<void> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  await prisma.$transaction(async (tx) => {
    // 更新不在 memberIdList 中的现有 employee 项目的 endDate
    await tx.employeeProject.updateMany({
      where: {
        employeeId: {
          notIn: memberIdList,
        },
        OR: [{ deletedAt: 0 }, { deletedAt: null }, { endDate: null }, { endDate: 0 }],
      },
      data: {
        endDate: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });

    // 查询所有在 memberIdList 中且没有 endDate 的记录
    const existingRecords = await tx.employeeProject.findMany({
      where: {
        employeeId: {
          in: memberIdList,
        },
        OR: [{ endDate: null }, { endDate: 0 }],
      },
    });

    const existingMemberIdList = existingRecords.map((record) => record.employeeId);

    // 为 memberIdList 中的新成员创建记录
    const newMembers = memberIdList.filter((memberId) => !existingMemberIdList.includes(memberId));

    if (newMembers.length > 0) {
      await tx.employeeProject.createMany({
        data: newMembers.map((memberId) => ({
          employeeId: memberId,
          projectId,
          startDate: nowTimestamp,
          endDate: null,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
          deletedAt: null,
        })),
      });
    }
  });
}

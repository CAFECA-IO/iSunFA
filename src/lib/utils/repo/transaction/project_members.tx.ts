import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';

export async function updateProjectMembers(
  projectId: number,
  memberIdList: number[]
): Promise<void> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  await prisma.$transaction(async (tx) => {
    // Info: (20240619 - Jacky) 更新不在 memberIdList 中的現有 employee 項目的 endDate
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

    // Info: (20240619 - Jacky) 查詢所有在 memberIdList 中且沒有 endDate 的記錄
    const existingRecords = await tx.employeeProject.findMany({
      where: {
        employeeId: {
          in: memberIdList,
        },
        OR: [{ endDate: null }, { endDate: 0 }],
      },
    });

    const existingMemberIdList = existingRecords.map((record) => record.employeeId);

    // Info: (20240619 - Jacky) 為 memberIdList 中的新成員建立記錄
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

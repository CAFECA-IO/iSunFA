import prisma from '@/client';

export async function listWorkRate(employeeProjectIdList: number[]) {
  const workRateList = await prisma.workRate.findMany({
    where: {
      employeeProjectId: {
        in: employeeProjectIdList,
      },
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    include: {
      employeeProject: {
        select: {
          employee: {
            select: {
              name: true,
              imageId: true,
            },
          },
        },
      },
    },
  });
  return workRateList;
}

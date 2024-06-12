import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';

export async function listWorkRate(employeeProjectIdList: number[]) {
  const workRateList = await prisma.workRate.findMany({
    where: {
      employeeProjectId: {
        in: employeeProjectIdList,
      },
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
  if (!workRateList) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  return workRateList;
}

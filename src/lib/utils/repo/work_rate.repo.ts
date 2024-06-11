import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IWorkRate } from '@/interfaces/project';

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
  const formattedWorkRateList: IWorkRate[] = workRateList.map((workRate) => {
    const { employeeProject, ...rest } = workRate;
    const { employee } = employeeProject;
    const formattedWorkRate = {
      ...rest,
      member: {
        name: employee.name,
        imageId: employee.imageId ?? '',
      },
    };
    return formattedWorkRate;
  });
  return formattedWorkRateList;
}

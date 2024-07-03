import { IWorkRate } from '@/interfaces/project';
import { WorkRate } from '@prisma/client';

export async function formatWorkRateList(
  workRateList: (WorkRate & {
    employeeProject: { employee: { name: string; imageId: string | null } };
  })[]
) {
  const formattedWorkRateList: IWorkRate[] = workRateList.map((workRate) => {
    const { employeeProject, ...rest } = workRate;
    const { employee } = employeeProject;
    const formattedWorkRate = {
      ...rest,
      member: {
        name: employee.name,
        imageId: employee.imageId ?? '',
      },
      involvementRate: workRate.involvementRate ?? 0,
    };
    return formattedWorkRate;
  });
  return formattedWorkRateList;
}

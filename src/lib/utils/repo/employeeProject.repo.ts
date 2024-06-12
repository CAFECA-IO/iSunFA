import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { EmployeeProject } from '@prisma/client';

export async function listEmployeeProject(projectId: number): Promise<EmployeeProject[]> {
  const employeeInProject = await prisma.employeeProject.findMany({
    where: {
      projectId,
    },
  });
  if (!employeeInProject) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return employeeInProject;
}

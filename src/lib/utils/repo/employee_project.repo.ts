import prisma from '@/client';
import { EmployeeProject } from '@prisma/client';

export async function listEmployeeProject(projectId: number): Promise<EmployeeProject[]> {
  const employeeInProject = await prisma.employeeProject.findMany({
    where: {
      projectId,
    },
    orderBy: {
      id: 'asc',
    },
  });
  return employeeInProject;
}

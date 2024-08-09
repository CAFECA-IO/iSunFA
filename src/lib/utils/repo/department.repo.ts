import prisma from '@/client';
import { EmployeeDepartments } from '@/interfaces/employees';

export async function getDepartments() {
  const rawDepartments = await prisma.department.findMany({
    select: {
      name: true,
    },
  });
  const departmentsList: EmployeeDepartments = rawDepartments.map((department) => department.name);
  return departmentsList;
}

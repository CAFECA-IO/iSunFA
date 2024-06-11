import { IProject, IWorkRate } from '@/interfaces/project';
import { Project, WorkRate } from '@prisma/client';

export async function formatProjectList(
  listedProject: (Project & {
    employeeProjects: { employee: { name: string; imageId: string | null } }[];
    value: { totalRevenue: number; totalExpense: number; netProfit: number } | null;
    _count: { contracts: number };
  })[]
) {
  const projectList: IProject[] = listedProject.map((project) => {
    const { employeeProjects, value, _count, ...rest } = project;
    const employeeList = employeeProjects.map((employeeProject) => {
      const { employee, ...restEmployeeProject } = employeeProject;
      return {
        ...employee,
        ...restEmployeeProject,
        imageId: employee.imageId ?? '',
      };
    });
    return {
      ...rest,
      imageId: rest.imageId ?? '',
      members: employeeList,
      income: value ? value.totalExpense : 0,
      expense: value ? value.totalRevenue : 0,
      profit: value ? value.netProfit : 0,
      contractAmount: _count.contracts,
    };
  });
  return projectList;
}

export async function formatProject(
  getProject: Project & {
    employeeProjects: { employee: { name: string; imageId: string | null } }[];
    value: { totalRevenue: number; totalExpense: number; netProfit: number } | null;
    _count: { contracts: number };
  }
) {
  const { employeeProjects, value, _count, ...rest } = getProject;
  const employeeList = employeeProjects.map((employeeProject) => {
    const { employee, ...restEmployeeProject } = employeeProject;
    return {
      ...employee,
      ...restEmployeeProject,
      imageId: employee.imageId ?? '',
    };
  });
  return {
    ...rest,
    members: employeeList,
    income: value ? value.totalExpense : 0,
    expense: value ? value.totalRevenue : 0,
    profit: value ? value.netProfit : 0,
    contractAmount: _count.contracts,
    imageId: rest.imageId ?? '',
  };
}

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

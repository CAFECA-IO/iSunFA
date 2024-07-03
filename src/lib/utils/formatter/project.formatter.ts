import { IProject } from '@/interfaces/project';
import { Project } from '@prisma/client';

export async function formatProjectList(
  listedProject: (Project & {
    employeeProjects: { employee: { name: string; imageId: string | null } }[];
    value: { totalRevenue: number; totalExpense: number; netProfit: number } | null;
    _count: { contracts: number };
  })[]
) {
  let projectList: IProject[] = [];
  if (listedProject.length > 0) {
    const formattedProjectList: IProject[] = listedProject.map((project) => {
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
    projectList = formattedProjectList;
  }
  return projectList;
}

export async function formatProject(
  getProject: Project & {
    employeeProjects: { employee: { name: string; imageId: string | null } }[];
    value: { totalRevenue: number; totalExpense: number; netProfit: number } | null;
    _count: { contracts: number };
  }
) {
  let project: IProject = {} as IProject;
  if (getProject) {
    const { employeeProjects, value, _count, ...rest } = getProject;
    const employeeList = employeeProjects.map((employeeProject) => {
      const { employee, ...restEmployeeProject } = employeeProject;
      return {
        ...employee,
        ...restEmployeeProject,
        imageId: employee.imageId ?? '',
      };
    });
    project = {
      ...rest,
      members: employeeList,
      income: value ? value.totalExpense : 0,
      expense: value ? value.totalRevenue : 0,
      profit: value ? value.netProfit : 0,
      contractAmount: _count.contracts,
      imageId: rest.imageId ?? '',
    };
  }
  return project;
}

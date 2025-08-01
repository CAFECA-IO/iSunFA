import { IProject } from '@/interfaces/project';
import { Project, File } from '@prisma/client';

export function formatProject(
  getProject: Project & {
    employeeProjects: { employee: { name: string; imageId: string | null } }[];
    value: { totalRevenue: number; totalExpense: number; netProfit: number } | null;
    _count: { contracts: number };
    imageFile: File | null;
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
      companyId: rest.accountBookId, // Info: (20250801 - Shirley) Map accountBookId to companyId for interface compatibility
      members: employeeList,
      income: value ? value.totalExpense : 0,
      expense: value ? value.totalRevenue : 0,
      profit: value ? value.netProfit : 0,
      contractAmount: _count.contracts,
      imageId: rest?.imageFile?.name ?? '',
    };
  }
  return project;
}

export async function formatProjectList(
  listedProject: (Project & {
    employeeProjects: { employee: { name: string; imageId: string | null } }[];
    value: { totalRevenue: number; totalExpense: number; netProfit: number } | null;
    imageFile: File | null;
    _count: { contracts: number };
  })[]
) {
  let projectList: IProject[] = [];
  if (listedProject.length > 0) {
    const formattedProjectList: IProject[] = listedProject.map((project) => formatProject(project));
    projectList = formattedProjectList;
  }
  return projectList;
}

import { IProject } from '@/interfaces/project';
import { Employee, Project, Value } from '@prisma/client';

// const listedProject = listProject(1);
export async function formatProjectList(
  listedProject: (Project & {
    employeeProjects: { employee: Employee }[];
    values: Value[];
    _count: { contracts: number };
  })[]
) {
  const projectList: IProject[] = listedProject.map((project) => {
    const { employeeProjects, values, _count, ...rest } = project;
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
      income: values[values.length - 1].totalExpense,
      expense: values[values.length - 1].totalRevenue,
      profit: values[values.length - 1].netProfit,
      contractAmount: _count.contracts,
    };
  });
  return projectList;
}

export async function formatProject(
  getProject: Project & {
    employeeProjects: { employee: Employee }[];
    values: Value[];
    _count: { contracts: number };
  }
): Promise<IProject> {
  const { employeeProjects, values, _count, ...rest } = getProject;
  const employeeList = employeeProjects.map((employeeProject) => {
    const { employee, ...restEmployeeProject } = employeeProject;
    return {
      ...employee,
      ...restEmployeeProject,
      imageId: employee.imageId ?? '',
    };
  });
  const project: IProject = {
    ...rest,
    members: employeeList,
    income: values[values.length - 1].totalExpense,
    expense: values[values.length - 1].totalRevenue,
    profit: values[values.length - 1].netProfit,
    contractAmount: _count.contracts,
    imageId: rest.imageId ?? '',
  };
  return project;
}

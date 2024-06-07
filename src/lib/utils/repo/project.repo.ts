import { IProject } from '@/interfaces/project';
import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { timestampInSeconds } from '../common';

export async function listProject(companyId: number) {
  const listedProject = await prisma.project.findMany({
    where: {
      companyId,
    },
    include: {
      employeeProjects: {
        select: {
          employee: {
            select: {
              name: true,
              imageId: true,
            },
          },
        },
      },
      values: {
        select: {
          totalRevenue: true,
          totalExpense: true,
          netProfit: true,
        },
      },
      _count: {
        select: {
          contracts: true,
        },
      },
    },
  });
  if (!listedProject) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const projectList: IProject[] = listedProject.map((project) => {
    const { employeeProjects, values, _count, ...rest } = project;
    const employeeList = employeeProjects.map((employeeProject) => {
      const { employee, ...restEmployeeProject } = employeeProject;
      return {
        ...employee,
        ...restEmployeeProject,
      };
    });
    return {
      ...rest,
      members: employeeList,
      income: values[values.length - 1].totalExpense,
      expense: values[values.length - 1].totalRevenue,
      profit: values[values.length - 1].netProfit,
      contractAmount: _count.contracts,
    };
  });
  return projectList;
}

export async function getProjectById(projectId: number): Promise<IProject> {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      employeeProjects: {
        include: {
          employee: {
            select: {
              name: true,
              imageId: true,
            },
          },
        },
      },
      values: {
        select: {
          totalRevenue: true,
          totalExpense: true,
          netProfit: true,
        },
      },
      _count: {
        select: {
          contracts: true,
        },
      },
    },
  });
  if (!project) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const { employeeProjects, values, _count, ...rest } = project;
  const employeeList = employeeProjects.map((employeeProject) => {
    const { employee, ...restEmployeeProject } = employeeProject;
    return {
      ...employee,
      ...restEmployeeProject,
    };
  });
  const newProject: IProject = {
    ...rest,
    members: employeeList,
    income: values[values.length - 1].totalExpense,
    expense: values[values.length - 1].totalRevenue,
    profit: values[values.length - 1].netProfit,
    contractAmount: _count.contracts,
  };
  return newProject;
}

export async function createProject(
  companyId: number,
  name: string,
  stage: string,
  members: number[]
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const createdProject = await prisma.project.create({
    data: {
      companyId,
      name,
      stage,
      employeeProjects: {
        create: members.map((memberId: number) => ({
          employeeId: memberId,
          startDate: nowTimestamp,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        })),
      },
      completedPercent: 0,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      employeeProjects: {
        include: {
          employee: {
            select: {
              name: true,
              imageId: true,
            },
          },
        },
      },
      values: {
        select: {
          totalRevenue: true,
          totalExpense: true,
          netProfit: true,
        },
      },
      _count: {
        select: {
          contracts: true,
        },
      },
    },
  });
  const { employeeProjects, values, _count, ...rest } = createdProject;
  const newProject: IProject = {
    ...rest,
    members: createdProject.employeeProjects.map((employeeProject) => ({
      name: employeeProject.employee.name,
      imageId: employeeProject.employee.imageId as string,
    })),
    income: values[createdProject.values.length - 1].totalExpense,
    expense: values[createdProject.values.length - 1].totalRevenue,
    profit: values[createdProject.values.length - 1].netProfit,
    contractAmount: _count.contracts,
  };
  return newProject;
}

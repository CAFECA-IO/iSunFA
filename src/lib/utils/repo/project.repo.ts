import { IProject } from '@/interfaces/project';
import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { Employee, Project, Value } from '@prisma/client';
import { timestampInSeconds } from '../common';

export async function listProject(companyId: number) {
  const listedProject = await prisma.project.findMany({
    where: {
      companyId,
    },
    include: {
      employeeProjects: {
        select: {
          employee: true,
        },
      },
      value: true,
      _count: {
        select: {
          contracts: true,
        },
      },
    },
  });
  return listedProject;
}

export async function getProjectById(projectId: number): Promise<
  Project & {
    employeeProjects: { employee: Employee }[];
    value: Value | null;
    _count: { contracts: number };
  }
> {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      employeeProjects: {
        select: {
          employee: true,
        },
      },
      value: true,
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
  return project;
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
      value: {
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
  const { employeeProjects, value, _count, ...rest } = createdProject;
  const newProject: IProject = {
    ...rest,
    members: createdProject.employeeProjects.map((employeeProject) => ({
      name: employeeProject.employee.name,
      imageId: employeeProject.employee.imageId as string,
    })),
    income: value ? value.totalExpense : 0,
    expense: value ? value.totalRevenue : 0,
    profit: value ? value.netProfit : 0,
    contractAmount: _count.contracts,
  };
  return newProject;
}

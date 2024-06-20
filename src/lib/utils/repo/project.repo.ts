import { IProject } from '@/interfaces/project';
import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { Employee, Project, Value } from '@prisma/client';
import { Milestone } from '@/constants/milestone';
import { timestampInSeconds } from '@/lib/utils/common';

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
  stage: Milestone,
  members?: number[],
  imageId?: string
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const createdProject = await prisma.project.create({
    data: {
      companyId,
      name,
      stage,
      imageId,
      employeeProjects: {
        create: (members ?? []).map((memberId: number) => ({
          employeeId: memberId,
          startDate: nowTimestamp,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        })),
      },
      milestones: {
        createMany: {
          data: Object.values(Milestone).map((milestone) => ({
            status: milestone,
            startDate: stage === milestone ? nowTimestamp : 0,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          })),
        },
      },
      values: {
        create: [
          {
            totalRevenue: 0,
            totalExpense: 0,
            totalRevenueGrowthIn30d: 0,
            netProfit: 0,
            netProfitGrowthIn30d: 0,
            netProfitGrowthInYear: 0,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        ],
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
    imageId: rest.imageId ?? '',
  };
  return newProject;
}

export async function updateProjectById(projectId: number, name?: string, imageId?: string) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      name,
      imageId,
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
  const { employeeProjects, values, _count, ...rest } = updatedProject;
  const newProject: IProject = {
    ...rest,
    members: updatedProject.employeeProjects.map((employeeProject) => ({
      name: employeeProject.employee.name,
      imageId: employeeProject.employee.imageId as string,
    })),
    income: values[updatedProject.values.length - 1].totalExpense,
    expense: values[updatedProject.values.length - 1].totalRevenue,
    profit: values[updatedProject.values.length - 1].netProfit,
    contractAmount: _count.contracts,
    imageId: rest.imageId ?? '',
  };
  return newProject;
}

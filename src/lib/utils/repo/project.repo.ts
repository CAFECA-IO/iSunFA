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
): Promise<
  Project & {
    employeeProjects: { employee: { name: string; imageId: string | null } }[];
    value: { totalRevenue: number; totalExpense: number; netProfit: number } | null;
    _count: { contracts: number };
  }
> {
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
      value: {
        create: {
          totalRevenue: 0,
          totalExpense: 0,
          totalRevenueGrowthIn30d: 0,
          netProfit: 0,
          netProfitGrowthIn30d: 0,
          netProfitGrowthInYear: 0,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
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
  return createdProject;
}

export async function updateProjectById(
  projectId: number,
  name?: string,
  imageId?: string
): Promise<
  Project & {
    employeeProjects: { employee: { name: string; imageId: string | null } }[];
    value: { totalRevenue: number; totalExpense: number; netProfit: number } | null;
    _count: { contracts: number };
  }
> {
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

  return updatedProject;
}

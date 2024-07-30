import prisma from '@/client';
import { Employee, Project, Value } from '@prisma/client';
import { Milestone } from '@/constants/milestone';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';

export async function listProject(companyId: number) {
  const listedProject = await prisma.project.findMany({
    where: {
      companyId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      id: 'asc',
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
  | (Project & {
      employeeProjects: { employee: Employee }[];
      value: Value | null;
      _count: { contracts: number };
    })
  | null
> {
  let project = null;
  if (projectId > 0) {
    project = await prisma.project.findUnique({
      where: {
        id: projectId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
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

export async function deleteProjectById(projectId: number) {
  const nowInSecond = getTimestampNow();

  // Info: (20240723 - Murky) All delete can use same "where" and data
  const where = {
    projectId,
    deletedAt: null,
  };

  const data = {
    deletedAt: nowInSecond,
  };

  const updateArgs = {
    where,
    data,
  };

  await prisma.$transaction([
    prisma.milestone.updateMany(updateArgs),
    prisma.value.updateMany(updateArgs),
    prisma.employeeProject.updateMany(updateArgs),
    prisma.project.updateMany({
      where: {
        id: projectId,
      },
      data,
    }),
  ]);
}

export async function deleteProjectByIdForTest(projectId: number) {
  // Info: (20240723 - Murky) All delete can use same "where" and data
  const where = {
    projectId,
    deletedAt: null,
  };

  const deleteArg = {
    where,
  };

  await prisma.$transaction([
    prisma.milestone.deleteMany(deleteArg),
    prisma.value.deleteMany(deleteArg),
    prisma.employeeProject.deleteMany(deleteArg),
    prisma.project.deleteMany({
      where: {
        id: projectId,
      },
    }),
  ]);
}

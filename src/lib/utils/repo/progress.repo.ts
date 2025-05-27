import prisma from '@/client';

export async function listProjectProgress(projectId: number): Promise<number> {
  let completedPercent = 0;
  if (projectId > 0) {
    const projectProgress = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      select: {
        completedPercent: true,
      },
    });
    if (projectProgress) {
      completedPercent = projectProgress.completedPercent;
    }
  }
  return completedPercent;
}

export async function getStatusNumber(dateToTimeStamp: number, accountBookId: number) {
  const statusNumber = await prisma.milestone.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
    where: {
      startDate: {
        lte: dateToTimeStamp,
      },
      endDate: {
        gte: dateToTimeStamp,
      },
      project: {
        accountBookId,
      },
    },
  });
  return statusNumber;
}

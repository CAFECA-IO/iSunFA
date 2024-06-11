import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';

export async function listProjectProgress(projectId: number): Promise<number> {
  const projectProgress = await prisma.project.findFirst({
    where: {
      id: projectId,
    },
    select: {
      completedPercent: true,
    },
  });
  if (!projectProgress) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const { completedPercent } = projectProgress || { completedPercent: 0 };
  return completedPercent;
}

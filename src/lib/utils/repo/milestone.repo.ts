import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IMilestone } from '@/interfaces/project';

export async function listProjectMilestone(projectId: number): Promise<IMilestone[]> {
  const milestoneList: IMilestone[] = await prisma.milestone.findMany({
    where: {
      projectId,
    },
  });
  if (!milestoneList) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return milestoneList;
}

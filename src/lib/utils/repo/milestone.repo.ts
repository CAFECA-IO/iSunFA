import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IMilestone } from '@/interfaces/project';

export async function listProjectMilestone(projectId: number): Promise<IMilestone[]> {
  const listedMilestone = await prisma.milestone.findMany({
    where: {
      projectId,
    },
  });
  const milestoneList: IMilestone[] = listedMilestone.map((milestone) => ({
    ...milestone,
    startDate: milestone.startDate ?? 0,
    endDate: milestone.endDate ?? 0,
  }));

  if (!milestoneList) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return milestoneList;
}

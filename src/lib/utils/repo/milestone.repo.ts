import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { Milestone } from '@prisma/client';

export async function listProjectMilestone(projectId: number): Promise<Milestone[]> {
  const listedMilestone: Milestone[] = await prisma.milestone.findMany({
    where: {
      projectId,
    },
  });
  if (!listedMilestone) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return listedMilestone;
}

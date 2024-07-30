import prisma from '@/client';
import { Milestone } from '@prisma/client';

export async function listProjectMilestone(projectId: number): Promise<Milestone[]> {
  let listedMilestone: Milestone[] = [];
  if (projectId > 0) {
    listedMilestone = await prisma.milestone.findMany({
      where: {
        projectId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
  }
  return listedMilestone;
}

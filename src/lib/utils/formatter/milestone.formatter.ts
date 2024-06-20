import { IMilestone } from '@/interfaces/project';
import { Milestone } from '@prisma/client';

export function formatMilestoneList(listedMilestone: Milestone[]): IMilestone[] {
  const milestoneList: IMilestone[] = listedMilestone.map((milestone) => {
    const formattedMilestone: IMilestone = {
      ...milestone,
      startDate: milestone.startDate ?? 0,
      endDate: milestone.endDate ?? 0,
    };
    return formattedMilestone;
  });
  return milestoneList;
}

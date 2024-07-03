import { listProjectMilestone } from '@/lib/utils/repo/milestone.repo';
import milestone from '@/seed_json/milestone.json';

describe('listProjectMilestone', () => {
  it('should return an empty array if projectId is less than or equal to 0', async () => {
    const projectId = 0;
    const result = await listProjectMilestone(projectId);
    expect(result).toEqual([]);
  });

  it('should return an array of milestones if projectId is greater than 0', async () => {
    const projectId = 1000;

    const result = await listProjectMilestone(projectId);
    const expectedMilestones = milestone.filter((m) => m.projectId === projectId);
    expect(result).toEqual(expectedMilestones);
  });
});

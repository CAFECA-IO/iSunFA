import { listProjectMilestone } from '@/lib/utils/repo/milestone.repo';

describe('listProjectMilestone', () => {
  it('should return an empty array if projectId is less than or equal to 0', async () => {
    const projectId = 0;
    const result = await listProjectMilestone(projectId);
    expect(result).toEqual([]);
  }, 1000000);

  it('should return an array of milestones if projectId is greater than 0', async () => {
    const projectId = 1000;

    const result = await listProjectMilestone(projectId);
    expect(result.length).toEqual(6);
  });
});

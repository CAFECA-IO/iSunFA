import { listProjectProgress } from '@/lib/utils/repo/progress.repo';
import projects from '@/seed_json/project.json';

describe('listProjectProgress', () => {
  it('should return completed percent for a valid project ID', async () => {
    const projectId = 1000;

    const result = await listProjectProgress(projectId);

    expect(result).toBe(projects[0].completedPercent);
  });

  it('should return 0 for an invalid project ID', async () => {
    const projectId = -1;
    const completedPercent = 0;

    const result = await listProjectProgress(projectId);

    expect(result).toBe(completedPercent);
  });
});

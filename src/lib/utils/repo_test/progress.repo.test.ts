import { listProjectProgress, getStatusNumber } from '@/lib/utils/repo/progress.repo';
import projects from '@/seed_json/project.json';

describe('projectProgress Repository Tests', () => {
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
  describe('getStatusNumber', () => {
    it('should get how many projects for each status', async () => {
      const companyId = 8867;
      const dateToTimeStamp = 1709578219;
      const statusNumber = await getStatusNumber(dateToTimeStamp, companyId);
      expect(statusNumber).toBeDefined();
      expect(Array.isArray(statusNumber)).toBe(true);
      expect(statusNumber.length).toBeGreaterThan(0);
    });
  });
});

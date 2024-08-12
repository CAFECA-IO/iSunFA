import { getProjectLists, getIncomeExpenses } from '@/lib/utils/repo/profit_comparison.repo';
import projects from '@/seed_json/project.json';

describe('profitComparison Repository Tests', () => {
  describe('getProjectLists', () => {
    it('should get project lists', async () => {
      const companyId = 1000;
      const projectLists = await getProjectLists(companyId);
      expect(projectLists).toBeDefined();
      expect(Array.isArray(projectLists)).toBe(true);
      expect(projectLists.length).toBeGreaterThan(0);
      expect(projectLists[0].id).toEqual(projects[0].id);
    });
  });
  describe('getIncomeExpenses', () => {
    it('should get income expense by projects', async () => {
      const companyId = 1000;
      const startDateToTimeStamp = 1682933165;
      const endDateToTimeStamp = 1711997419;
      const incomeExpenses = await getIncomeExpenses(
        startDateToTimeStamp,
        endDateToTimeStamp,
        companyId
      );
      expect(incomeExpenses).toBeDefined();
      expect(Array.isArray(incomeExpenses)).toBe(true);
      expect(incomeExpenses.length).toBeGreaterThan(0);
    });
  });
});

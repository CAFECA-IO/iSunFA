import {
  getIncomeExpenseToday,
  getIncomeExpenseYesterday,
  getProjectsIncomeExpense,
  getPreLaunchProjectCount,
} from '@/lib/utils/repo/profit_insight.repo';

describe('profitInsight Repository Tests', () => {
  describe('getIncomeExpenseToday', () => {
    it('should get income and expense for the target day', async () => {
      const startDayTimestampOfTargetTime = 1712102400;
      const endDayTimestampOfTargetTime = 1712188799;
      const companyId = 8867;
      const incomeExpenseToday = await getIncomeExpenseToday(
        startDayTimestampOfTargetTime,
        endDayTimestampOfTargetTime,
        companyId
      );
      expect(incomeExpenseToday).toBeDefined();
      expect(Array.isArray(incomeExpenseToday)).toBe(true);
      expect(incomeExpenseToday.length).toBeGreaterThan(0);
    });
  });
  describe('getIncomeExpenseYesterday', () => {
    it('should get income and expense for the previous target day', async () => {
      const startPreviousDayTimestampOfTargetTime = 1712016000;
      const endPreviousDayTimestampOfTargetTime = 1712102399;
      const companyId = 8867;
      const incomeExpenseYesterday = await getIncomeExpenseYesterday(
        startPreviousDayTimestampOfTargetTime,
        endPreviousDayTimestampOfTargetTime,
        companyId
      );
      expect(incomeExpenseYesterday).toBeDefined();
      expect(Array.isArray(incomeExpenseYesterday)).toBe(true);
      expect(incomeExpenseYesterday.length).toBeGreaterThan(0);
    });
  });
  describe('getProjectsIncomeExpense', () => {
    it('should get income and expense for each projects', async () => {
      const companyId = 8867;
      const projectsIncomeExpense = await getProjectsIncomeExpense(companyId);
      expect(projectsIncomeExpense).toBeDefined();
      expect(Array.isArray(projectsIncomeExpense)).toBe(true);
      expect(projectsIncomeExpense.length).toBeGreaterThan(0);
    });
  });
  describe('getPreLaunchProjectCount', () => {
    it('should get count for pre launch projects', async () => {
      const companyId = 8867;
      const preLaunchProjectCount = await getPreLaunchProjectCount(companyId);
      expect(preLaunchProjectCount).toBeDefined();
      expect(typeof preLaunchProjectCount).toBe('number');
    });
  });
});

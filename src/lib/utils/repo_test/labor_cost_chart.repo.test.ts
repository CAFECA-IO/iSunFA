import { getWorkRatesByCompanyId, getSalaryRecords } from '@/lib/utils/repo/labor_cost_chart.repo';
import workRateSeed from '@/seed_json/work_rate.json';
import salaryRecordsSeed from '@/seed_json/salary_record.json';

describe('LaborCostChart Repository Tests', () => {
  describe('getWorkRatesByCompanyId', () => {
    it('should get work rates by company id', async () => {
      const companyId = 1000;
      const date = 1634567890;
      const workRates = await getWorkRatesByCompanyId(companyId, date);
      expect(workRates).toBeDefined();
      expect(Array.isArray(workRates)).toBe(true);
      expect(workRates.length).toBeGreaterThan(0);
      expect(workRates[0].employeeProjectId).toEqual(workRateSeed[0].employeeProjectId);
      expect(workRates[0].actualHours).toEqual(workRateSeed[0].actualHours);
      expect(workRates[0].createdAt).toEqual(workRateSeed[0].createdAt);
      expect(workRates[1].employeeProjectId).toEqual(workRateSeed[1].employeeProjectId);
      expect(workRates[1].actualHours).toEqual(workRateSeed[1].actualHours);
      expect(workRates[1].createdAt).toEqual(workRateSeed[1].createdAt);
    });
  });
  describe('getSalaryRecords', () => {
    it('should get salary records by date', async () => {
      const date = 1630435200;
      const salaryRecords = await getSalaryRecords(date);
      expect(salaryRecords).toBeDefined();
      expect(Array.isArray(salaryRecords)).toBe(true);
      expect(salaryRecords.length).toBeGreaterThan(0);
      expect(salaryRecords[0].employee_id).toEqual(salaryRecordsSeed[0].employeeId);
      expect(salaryRecords[0].total_payment).toEqual(
        salaryRecordsSeed[0].salary +
          salaryRecordsSeed[0].insurancePayment +
          salaryRecordsSeed[0].bonus
      );
      expect(salaryRecords[0].created_at).toEqual(salaryRecordsSeed[0].createdAt);
    });
  });
});

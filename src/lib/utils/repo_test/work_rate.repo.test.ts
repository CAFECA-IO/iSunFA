import { listWorkRate } from '@/lib/utils/repo/work_rate.repo';
import workRates from '@/seed_json/work_rate.json';

describe('listWorkRate', () => {
  it('should return the work rate list', async () => {
    const employeeProjectIdList = [1000, 1001];
    const workRateList = await listWorkRate(employeeProjectIdList);
    expect(workRateList).toBeDefined();
    expect(Array.isArray(workRateList)).toBe(true);
    expect(workRateList[0].employeeProject.employee.name).toBe('TEST John Doe 1');
    expect(workRateList[0].involvementRate).toBe(workRates[0].involvementRate);
    expect(workRateList[0].actualHours).toBe(workRates[0].actualHours);
    expect(workRateList[0].expectedHours).toBe(workRates[0].expectedHours);
    expect(workRateList[0].createdAt).toBe(workRates[0].createdAt);
  });
  it('should return an empty array if the work rate list is not found', async () => {
    const employeeProjectIdList = [-1];
    const workRateList = await listWorkRate(employeeProjectIdList);
    expect(workRateList).toBeDefined();
    expect(Array.isArray(workRateList)).toBe(true);
    expect(workRateList).toHaveLength(0);
  });
});

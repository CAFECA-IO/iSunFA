import { getDepartments } from '@/lib/utils/repo/department.repo';
import departmentRecords from '@/seed_json/department.json';

describe('Department Repository Tests', () => {
  describe('getDepartments', () => {
    it('should get department records', async () => {
      const departments = await getDepartments();
      expect(departments).toBeDefined();
      expect(departments).toEqual(departmentRecords.map((department) => department.name));
    });
  });
});

import prisma from '@/client';
import {
  getEmployeeById,
  getProjectsByEmployeeId,
  updateEmployeeById,
  createEmployee,
} from '@/lib/utils/repo/employee.repo';
import employeeRecords from '@/seed_json/employee.json';
import employeeProjects from '@/seed_json/employee_project.json';

describe('Employee Repository Tests', () => {
  describe('createEmployee', () => {
    it('should create a new employee record', async () => {
      const newEmployee = {
        name: 'KFC',
        department: 'Engineering',
        companyId: 1000,
        salaryPayMode: 'monthly',
        payFrequency: 'monthly',
        salary: 100000,
        bonus: 10000,
      };
      const employee = await createEmployee(
        newEmployee.companyId,
        newEmployee.name,
        newEmployee.department,
        newEmployee.salaryPayMode,
        newEmployee.payFrequency,
        newEmployee.salary,
        newEmployee.bonus
      );
      expect(employee).toBeDefined();
      expect(typeof employee.id).toBe('number');
      expect(employee.imageId).toBe(undefined);
      expect(employee.name).toBe(newEmployee.name);
      expect(typeof employee.departmentId).toBe('number');
      expect(employee.companyId).toBe(newEmployee.companyId);
      expect(employee.salary).toBe(newEmployee.salary);
      expect(typeof employee.insurancePayment).toBe('number');
      expect(employee.bonus).toBe(newEmployee.bonus);
      expect(employee.salaryPayMode).toBe(newEmployee.salaryPayMode);
      expect(employee.payFrequency).toBe(newEmployee.payFrequency);
      expect(typeof employee.startDate).toBe('number');
      expect(employee.endDate).toBe(undefined);
      expect(typeof employee.createdAt).toBe('number');
      expect(typeof employee.updatedAt).toBe('number');
      await prisma.employee.delete({
        where: {
          id: employee.id,
        },
      });
    });
  });
  describe('getEmployeeById', () => {
    it('should get an employee by id', async () => {
      const employeeId = 1000;
      const employeeFromDb = await getEmployeeById(employeeId);
      expect(employeeFromDb).toBeDefined();
      expect(employeeFromDb!.id).toEqual(employeeRecords[0].id);
      expect(employeeFromDb!.name).toEqual(employeeRecords[0].name);
      expect(employeeFromDb!.imageId).toEqual(employeeRecords[0].imageId);
      expect(employeeFromDb!.departmentId).toEqual(employeeRecords[0].departmentId);
      expect(employeeFromDb!.companyId).toEqual(employeeRecords[0].companyId);
      expect(employeeFromDb!.salary).toEqual(employeeRecords[0].salary);
      expect(employeeFromDb!.insurancePayment).toEqual(employeeRecords[0].insurancePayment);
      expect(employeeFromDb!.bonus).toEqual(employeeRecords[0].bonus);
      expect(employeeFromDb!.salaryPayMode).toEqual(employeeRecords[0].salaryPayMode);
      expect(employeeFromDb!.payFrequency).toEqual(employeeRecords[0].payFrequency);
      expect(employeeFromDb!.startDate).toEqual(employeeRecords[0].startDate);
      expect(employeeFromDb!.endDate).toEqual(employeeRecords[0].endDate);
      expect(employeeFromDb!.createdAt).toEqual(employeeRecords[0].createdAt);
      expect(employeeFromDb!.updatedAt).toEqual(employeeRecords[0].updatedAt);
      expect(employeeFromDb!.deletedAt).toEqual(employeeRecords[0].deletedAt);
    });
  });
  describe('getProjectsByEmployeeId', () => {
    // TODO (20240820 - Jacky): Fix this test
    xit('should get projects by employee id', async () => {
      const employeeId = 1000;
      const projectsFromDb = await getProjectsByEmployeeId(employeeId);
      expect(projectsFromDb).toBeDefined();
      expect(Array.isArray(projectsFromDb)).toBe(true);
      expect(projectsFromDb.length).toBeGreaterThan(0);
      expect(projectsFromDb[0].project.id).toEqual(employeeProjects[0].projectId);
    });
  });
  describe('updateEmployeeById', () => {
    it('update an employee info by id', async () => {
      const employeeId = 1000;
      const updateInfo = {
        salary: 5000,
        bonus: 1000,
        insurancePayment: 200,
        salaryPayMode: 'monthly',
        payFrequency: 'monthly',
        targetTime: 1630435200,
      };
      await updateEmployeeById(
        employeeId,
        updateInfo.salary,
        updateInfo.bonus,
        updateInfo.insurancePayment,
        updateInfo.salaryPayMode,
        updateInfo.payFrequency,
        updateInfo.targetTime
      );
      const employeeFromDb = await getEmployeeById(employeeId);
      expect(employeeFromDb).toBeDefined();
      expect(employeeFromDb!.salary).toEqual(updateInfo.salary);
      expect(employeeFromDb!.bonus).toEqual(updateInfo.bonus);
      expect(employeeFromDb!.insurancePayment).toEqual(updateInfo.insurancePayment);
      expect(employeeFromDb!.salaryPayMode).toEqual(updateInfo.salaryPayMode);
      expect(employeeFromDb!.payFrequency).toEqual(updateInfo.payFrequency);
    });
  });
});

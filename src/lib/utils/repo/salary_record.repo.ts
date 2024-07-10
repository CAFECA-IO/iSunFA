import prisma from '@/client';
import { ISalaryRecord } from '@/interfaces/salary_record';
import { timestampInSeconds, calculateWorkingHours } from '@/lib/utils/common';

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export async function getSalaryInfoByEmployeeId(
  id: number
): Promise<{
  id: number;
  salary: number;
  insurancePayment: number;
  bonus: number;
  name: string;
  department: string;
} | null> {
  const employeeInfo = await prisma.employee.findFirst({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      salary: true,
      insurancePayment: true,
      bonus: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });
  const formatEmployeeInfo = employeeInfo
    ? {
        id: employeeInfo.id,
        salary: employeeInfo.salary,
        insurancePayment: employeeInfo.insurancePayment,
        bonus: employeeInfo.bonus,
        name: employeeInfo.name,
        department: employeeInfo.department.name,
      }
    : null;
  return formatEmployeeInfo;
}

export async function createSalaryRecord(
  type: string,
  frequency: string,
  startDate: number,
  endDate: number,
  employeeIdList: number[],
  description: string
): Promise<ISalaryRecord[]> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const totalWorkingHours = calculateWorkingHours(startDate, endDate);
  const newSalaryRecords = await Promise.all(
    employeeIdList.map(async (employeeId) => {
      const formatEmployeeInfo = await getSalaryInfoByEmployeeId(employeeId);
      if (!formatEmployeeInfo) {
        return null;
      }
      const salary: ISalaryRecord = {
        employeeId,
        employeeName: formatEmployeeInfo.name,
        employeeDepartment: formatEmployeeInfo.department,
        salary: formatEmployeeInfo.salary,
        insurancePayment: formatEmployeeInfo.insurancePayment,
        bonus: formatEmployeeInfo.bonus,
        description,
        startDate,
        endDate,
        workingHour: totalWorkingHours,
        confirmed: false,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };
      return salary;
    })
  );
  const validateNewSalaryRecords = newSalaryRecords.filter(notEmpty<ISalaryRecord>);
  if (validateNewSalaryRecords.length === 0) {
    return [];
  } else {
    const savedSalaryRecords = validateNewSalaryRecords.map((record) => {
      return {
        employeeId: record.employeeId,
        salary: record.salary,
        insurancePayment: record.insurancePayment,
        bonus: record.bonus,
        description: record.description,
        startDate: record.startDate,
        endDate: record.endDate,
        workingHour: record.workingHour,
        confirmed: record.confirmed,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });
    await prisma.salaryRecord.createMany({
      data: savedSalaryRecords,
    });
    return validateNewSalaryRecords;
  }
}

export async function getSalaryRecordsList(companyId: number): Promise<ISalaryRecord[]> {
  const salaryRecordsLists = await prisma.salaryRecord.findMany({
    where: {
      employee: {
        companyId,
      },
    },
    select: {
      employeeId: true,
      employee: {
        select: {
          name: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      },
      salary: true,
      insurancePayment: true,
      bonus: true,
      description: true,
      startDate: true,
      endDate: true,
      workingHour: true,
      confirmed: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const formatSalaryRecordsLists = salaryRecordsLists.map((record) => {
    return {
      employeeId: record.employeeId,
      employeeName: record.employee.name,
      employeeDepartment: record.employee.department.name,
      salary: record.salary,
      insurancePayment: record.insurancePayment,
      bonus: record.bonus,
      description: record.description,
      startDate: record.startDate,
      endDate: record.endDate,
      workingHour: record.workingHour,
      confirmed: record.confirmed,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  });
  return formatSalaryRecordsLists;
}

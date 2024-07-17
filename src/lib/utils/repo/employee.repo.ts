import { IEasyEmployeeWithPagination, IEmployee } from '@/interfaces/employees';
import prisma from '@/client';
import { Prisma } from '@prisma/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { timestampInSeconds } from '@/lib/utils/common';

export async function listEmployees(
  companyId: number,
  searchQuery?: string,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  targetPage: number = DEFAULT_PAGE_NUMBER
): Promise<IEasyEmployeeWithPagination | null> {
  try {
    const where: Prisma.EmployeeWhereInput = {
      companyId,
      OR: searchQuery
        ? [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { department: { name: { contains: searchQuery, mode: 'insensitive' } } },
            { payFrequency: { contains: searchQuery, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const totalCount = await prisma.employee.count({ where });
    const totalPages = Math.ceil(totalCount / pageSize);

    if (targetPage < 1) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const include = {
      department: true,
    };

    const skip = (targetPage - 1) * pageSize;

    const findManyArgs = {
      where,
      include,
      take: pageSize + 1,
      skip,
    };

    const employees = await prisma.employee.findMany(findManyArgs);
    const formattedEmployees = employees.map((employee) => {
      return {
        id: employee.id,
        name: employee.name,
        department: employee.department.name,
        payFrequency: employee.payFrequency,
        salary: employee.salary,
      };
    });

    const hasNextPage = employees.length > pageSize;
    const hasPreviousPage = targetPage > 1;

    if (employees.length > pageSize) {
      employees.pop();
    }

    return {
      data: formattedEmployees,
      page: targetPage,
      totalPages,
      totalCount,
      pageSize,
      hasNextPage,
      hasPreviousPage,
    };
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function createEmployee(
  companyId: number,
  name: string,
  department: string,
  salaryPayMode: string,
  payFrequency: string,
  salary: number,
  bonus: number
): Promise<IEmployee> {
  try {
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    const departmentData = await prisma.department.findFirst({
      where: { name: department, companyId },
    });

    if (!departmentData) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const employeeData = await prisma.employee.create({
      data: {
        name,
        departmentId: departmentData.id,
        companyId,
        salaryPayMode,
        payFrequency,
        salary,
        bonus,
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
        insurancePayment: 0,
      },
    });
    return {
      id: employeeData.id,
      imageId: undefined,
      name: employeeData.name,
      departmentId: employeeData.departmentId,
      companyId: employeeData.companyId,
      salary: employeeData.salary,
      insurancePayment: employeeData.insurancePayment,
      bonus: employeeData.bonus,
      salaryPayMode: employeeData.salaryPayMode,
      payFrequency: employeeData.payFrequency,
      startDate: employeeData.startDate,
      endDate: undefined,
      createdAt: employeeData.createdAt,
      updatedAt: employeeData.updatedAt,
    };
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

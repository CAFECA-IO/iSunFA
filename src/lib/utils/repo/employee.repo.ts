import { IEasyEmployeeWithPagination, IEmployee } from '@/interfaces/employees';
import prisma from '@/client';
import { Prisma } from '@prisma/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { timestampInSeconds } from '@/lib/utils/common';
import { getInsuranceInfo } from '@/lib/utils/insurance';
import { SortOrder } from '@/constants/sort';

export async function listEmployees(
  accountBookId: number,
  searchQuery?: string,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  targetPage: number = DEFAULT_PAGE_NUMBER
): Promise<IEasyEmployeeWithPagination | null> {
  try {
    const where: Prisma.EmployeeWhereInput = {
      accountBookId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
      ...(searchQuery
        ? [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { department: { name: { contains: searchQuery, mode: 'insensitive' } } },
            { payFrequency: { contains: searchQuery, mode: 'insensitive' } },
          ]
        : {}),
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

    if (hasNextPage) {
      formattedEmployees.pop();
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
  accountBookId: number,
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
    const insuranceInfo = getInsuranceInfo(salary);
    const insurancePayment = insuranceInfo.employerTotalContribution;
    const departmentData = await prisma.department.findFirst({
      where: { name: department, accountBookId },
    });
    if (!departmentData) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const employeeData = await prisma.employee.create({
      data: {
        name,
        departmentId: departmentData.id,
        accountBookId,
        salaryPayMode,
        payFrequency,
        salary,
        bonus,
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
        insurancePayment,
      },
    });
    return {
      id: employeeData.id,
      imageId: undefined,
      name: employeeData.name,
      departmentId: employeeData.departmentId,
      companyId: employeeData.accountBookId,
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

async function createEmployeeProject(
  projectsToAdd: { id: number; name: string }[],
  employeeId: number,
  targetTime: number
) {
  const employeeProjectData = projectsToAdd.map((project) => {
    return {
      employeeId,
      projectId: project.id,
      startDate: targetTime,
      endDate: null,
      createdAt: targetTime,
      updatedAt: targetTime,
    };
  });
  await prisma.employeeProject.createMany({
    data: employeeProjectData,
  });
}

async function updateEmployeeProjectEndDate(
  projectsToEnd: { project: { id: number; name: string } }[],
  employeeIdNumber: number,
  targetTime: number
) {
  await prisma.employeeProject.updateMany({
    where: {
      employeeId: employeeIdNumber,
      projectId: {
        in: projectsToEnd.map((project) => project.project.id),
      },
      endDate: null,
    },
    data: {
      endDate: targetTime,
      updatedAt: targetTime,
    },
  });
}

export async function updateEmployeeProject(
  employeeIdNumber: number,
  projectIdsNames: { id: number; name: string }[],
  targetTime: number
) {
  const currentProjectIdsNames = await prisma.employeeProject.findMany({
    where: {
      employeeId: employeeIdNumber,
      endDate: null,
    },
    select: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  if (currentProjectIdsNames.length === 0) {
    await createEmployeeProject(projectIdsNames, employeeIdNumber, targetTime);
  } else {
    const projectsToAdd = projectIdsNames.filter(
      (project) =>
        !currentProjectIdsNames.some((currentProject) => currentProject.project.id === project.id)
    );
    if (projectsToAdd.length > 0) {
      await createEmployeeProject(projectsToAdd, employeeIdNumber, targetTime);
    }
    const projectsToEnd = currentProjectIdsNames.filter(
      (currentProject) =>
        !projectIdsNames.some((project) => project.id === currentProject.project.id)
    );
    if (projectsToEnd.length > 0) {
      await updateEmployeeProjectEndDate(projectsToEnd, employeeIdNumber, targetTime);
    }
  }
}

export async function getEmployeeById(employeeIdNumber: number) {
  const employee = await prisma.employee.findUnique({
    where: {
      id: employeeIdNumber,
      endDate: null,
    },
    include: {
      department: true,
      employeeProjects: {
        select: {
          project: true,
        },
      },
    },
  });
  return employee;
}

export async function getProjectsByEmployeeId(employeeIdNumber: number) {
  const projects = await prisma.employeeProject.findMany({
    where: {
      employeeId: employeeIdNumber,
      endDate: null,
    },
    include: {
      project: true,
    },
    orderBy: {
      startDate: SortOrder.ASC,
    },
  });
  return projects;
}

export async function updateEndDateByEmployeeId(employeeIdNumber: number, targetTime: number) {
  await prisma.employee.update({
    where: {
      id: employeeIdNumber,
      endDate: null,
    },
    data: {
      endDate: targetTime,
      updatedAt: targetTime,
    },
  });
}

export async function updateEmployeeById(
  employeeIdNumber: number,
  salary: number,
  bonus: number,
  insurancePayment: number,
  salaryPayMode: string,
  payFrequency: string,
  targetTime: number
) {
  await prisma.employee.update({
    where: {
      id: employeeIdNumber,
      endDate: null,
    },
    data: {
      salary,
      bonus,
      insurancePayment,
      salaryPayMode,
      payFrequency,
      updatedAt: targetTime,
    },
  });
}

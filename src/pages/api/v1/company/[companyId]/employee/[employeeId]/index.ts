import type { NextApiRequest, NextApiResponse } from 'next';
import { IEmployeeData } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { checkUserAdmin } from '@/lib/utils/auth_check';
import { updateEmployeeProject } from '@/lib/utils/repo/employee.repo';
import prisma from '@/client';

async function getEmployee(employeeIdNumber: number): Promise<IEmployeeData> {
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
  const projects = await prisma.employeeProject.findMany({
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
  const projectIdsNames = projects.map((project) => {
    return { id: project.project.id, name: project.project.name };
  });
  let employeeData = {} as IEmployeeData;
  if (employee) {
    employeeData = {
      id: employee.id,
      name: employee.name,
      salary: employee.salary,
      department: employee.department.name,
      start_date: employee.startDate,
      bonus: employee.bonus,
      salary_payment_mode: employee.salaryPayMode,
      pay_frequency: employee.payFrequency,
      projects: projectIdsNames,
      insurance_payments: employee.insurancePayment,
      additionalOfTotal: employee.salary + employee.bonus + employee.insurancePayment,
    };
  }
  return employeeData;
}

async function deleteEmployee(employeeIdNumber: number): Promise<void> {
  const nowTime = new Date().getTime();
  const targetTime = timestampInSeconds(nowTime);
  try {
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
  } catch (error) {
    // Info: (20240627 - Gibbs) console error only
    // eslint-disable-next-line no-console
    console.log(error);
  }
}

async function updateEmployee(
  employeeIdNumber: number,
  salary: number,
  bonus: number,
  insurancePayment: number,
  salaryPayMode: string,
  payFrequency: string,
  projectIdsNames: { id: number; name: string }[]
): Promise<IEmployeeData> {
  try {
    const nowTime = new Date().getTime();
    const targetTime = timestampInSeconds(nowTime);
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
    await updateEmployeeProject(employeeIdNumber, projectIdsNames, targetTime);
  } catch (error) {
    // Info: (20240627 - Gibbs) console error only
    // eslint-disable-next-line no-console
    console.log(error);
  }
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
  const projects = await prisma.employeeProject.findMany({
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
  const formatProjectIdsNames = projects.map((project) => {
    return { id: project.project.id, name: project.project.name };
  });
  let employeeData = {} as IEmployeeData;
  if (employee) {
    employeeData = {
      id: employee.id,
      name: employee.name,
      salary: employee.salary,
      department: employee.department.name,
      start_date: employee.startDate,
      bonus: employee.bonus,
      salary_payment_mode: employee.salaryPayMode,
      pay_frequency: employee.payFrequency,
      projects: formatProjectIdsNames,
      insurance_payments: employee.insurancePayment,
      additionalOfTotal: employee.salary + employee.bonus + employee.insurancePayment,
    };
  }
  return employeeData;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IEmployeeData>>
) {
  let shouldContinue: boolean = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = {} as IEmployeeData;

  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const { employeeId } = req.query;
    const employeeIdNumber = Number(employeeId);
    if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'PUT') {
      shouldContinue = false;
    }
    if (shouldContinue) {
      shouldContinue = await checkUserAdmin({ userId, companyId });
    }
    switch (req.method) {
      case 'GET': {
        if (shouldContinue) {
          if (employeeIdNumber) {
            statusMessage = STATUS_MESSAGE.SUCCESS_GET;
            const employeeData = await getEmployee(employeeIdNumber);
            payload = employeeData;
          }
        }
        break;
      }
      case 'DELETE': {
        if (shouldContinue) {
          if (employeeIdNumber) {
            statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
            await deleteEmployee(employeeIdNumber);
          }
        }
        break;
      }
      case 'PUT': {
        if (shouldContinue) {
          const { salary, bonus, insurancePayment, salaryPayMode, payFrequency, projectIdsNames } =
            req.body;
          const employeeData = await updateEmployee(
            employeeIdNumber,
            salary,
            bonus,
            insurancePayment,
            salaryPayMode,
            payFrequency,
            projectIdsNames
          );
          statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
          payload = employeeData;
        }
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        payload = {} as IEmployeeData;
        break;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = {} as IEmployeeData;
  }
  const { httpCode, result } = formatApiResponse<IEmployeeData>(statusMessage, payload);
  res.status(httpCode).json(result);
}

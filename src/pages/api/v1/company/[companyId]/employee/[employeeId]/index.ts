import type { NextApiRequest, NextApiResponse } from 'next';
import { EmployeeData, IEmployee } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { checkAuth } from '@/lib/utils/auth_check';
import prisma from '@/client';

async function getEmployee(employeeIdNumber: number): Promise<EmployeeData> {
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
          name: true,
        },
      },
    },
  });
  const projectNames = projects.map((project) => project.project.name);
  let employeeData = {} as EmployeeData;
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
      projects: projectNames,
      insurance_payments: employee.insurancePayment,
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
      },
    });
  } catch (error) {
    return;
  }
}

async function updateEmployee(
  employeeIdNumber: number,
  salary: number,
  bonus: number,
  insurancePayment: number,
  salaryPayMode: string,
  payFrequency: string
): Promise<EmployeeData> {
  try {
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
      },
    });
  } catch (error) {
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
          name: true,
        },
      },
    },
  });
  const projectNames = projects.map((project) => project.project.name);
  let employeeData = {} as EmployeeData;
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
      projects: projectNames,
      insurance_payments: employee.insurancePayment,
    };
  }
  return employeeData;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<EmployeeData>>
) {
  let shouldContinue: boolean = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = {} as EmployeeData;

  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const { employeeId } = req.query;
    const employeeIdNumber = Number(employeeId);
    if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'PUT') {
      shouldContinue = false;
    }
    if (shouldContinue) {
      shouldContinue = await checkAuth(userId, companyId);
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
            await deleteEmployee(employeeIdNumber)
          }
        }
        break;
      }
      case 'PUT': {
        if (shouldContinue) {
          const {
            salary,
            bonus,
            insurancePayment,
            salaryPayMode,
            payFrequency,
          } = req.body;
          const employeeData = await updateEmployee(employeeIdNumber, salary, bonus, insurancePayment, salaryPayMode, payFrequency);
          statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
          payload = employeeData;
        }
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        payload = {} as EmployeeData;
        break;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = {} as EmployeeData;
  }
  const { httpCode, result } = formatApiResponse<EmployeeData[] | EmployeeData>(statusMessage, payload);
  res.status(httpCode).json(result);
}

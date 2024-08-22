import type { NextApiRequest, NextApiResponse } from 'next';
import { IEmployeeData } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import {
  updateEmployeeProject,
  getEmployeeById,
  getProjectsByEmployeeId,
  updateEndDateByEmployeeId,
  updateEmployeeById,
} from '@/lib/utils/repo/employee.repo';
import { AuthFunctionsKeys } from '@/interfaces/auth';

function getTargetTime(): number {
  const nowTime = new Date().getTime();
  return timestampInSeconds(nowTime);
}

function composeEmployeeData(
  employee: {
    id: number;
    name: string;
    salary: number;
    department: { name: string };
    startDate: number;
    bonus: number;
    salaryPayMode: string;
    payFrequency: string;
    insurancePayment: number;
  },
  formatProjectIdsNames: { id: number; name: string }[]
) {
  return {
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

async function getEmployee(employeeIdNumber: number): Promise<IEmployeeData> {
  const employee = await getEmployeeById(employeeIdNumber);
  const projects = await getProjectsByEmployeeId(employeeIdNumber);
  const projectIdsNames = projects.map((project) => {
    return { id: project.project.id, name: project.project.name };
  });
  let employeeData = {} as IEmployeeData;
  if (employee) {
    employeeData = composeEmployeeData(employee, projectIdsNames);
  }
  return employeeData;
}

async function deleteEmployee(employeeIdNumber: number): Promise<void> {
  const targetTime = getTargetTime();
  try {
    await updateEndDateByEmployeeId(employeeIdNumber, targetTime);
  } catch (error) {
    // Todo: (20240822 - Murky Anna) 使用 logger
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
    const targetTime = getTargetTime();
    await updateEmployeeById(
      employeeIdNumber,
      salary,
      bonus,
      insurancePayment,
      salaryPayMode,
      payFrequency,
      targetTime
    );
    await updateEmployeeProject(employeeIdNumber, projectIdsNames, targetTime);
  } catch (error) {
    // Todo: (20240822 - Murky Anna) 使用 logger
  }
  const employee = await getEmployeeById(employeeIdNumber);
  const projects = await getProjectsByEmployeeId(employeeIdNumber);
  const formatProjectIdsNames = projects.map((project) => {
    return { id: project.project.id, name: project.project.name };
  });
  let employeeData = {} as IEmployeeData;
  if (employee) {
    employeeData = composeEmployeeData(employee, formatProjectIdsNames);
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
      shouldContinue = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
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

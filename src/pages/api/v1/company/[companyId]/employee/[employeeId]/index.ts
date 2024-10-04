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
import { loggerError } from '@/lib/utils/logger_back';

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
    const logError = loggerError(0, 'delete employee in deleteEmployee failed', error as Error);
    logError.error(
      'Prisma related updateEndDateByEmployeeId in deleteEmployee in employee/employeeId/index.ts failed'
    );
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
    const logError = loggerError(0, 'update employee in updateEmployee failed', error as Error);
    logError.error(
      'Prisma related updateEmployeeById or updateEmployeeProject in updateEmployee in employee/employeeId/index.ts failed'
    );
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

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IEmployeeData | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IEmployeeData | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], {
      userId,
      companyId,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { employeeId } = req.query;
      const employeeIdNumber = Number(employeeId);
      if (employeeIdNumber) {
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        const employeeData = await getEmployee(employeeIdNumber);
        payload = employeeData;
      }
    }
  }

  return { statusMessage, payload };
}

async function handleDeleteRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<null>>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], {
      userId,
      companyId,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { employeeId } = req.query;
      const employeeIdNumber = Number(employeeId);
      if (employeeIdNumber) {
        statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        await deleteEmployee(employeeIdNumber);
      }
    }
  }

  return { statusMessage, payload };
}

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IEmployeeData | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IEmployeeData | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], {
      userId,
      companyId,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { employeeId } = req.query;
      const employeeIdNumber = Number(employeeId);
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
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<
    | { statusMessage: string; payload: IEmployeeData | null }
    | { statusMessage: string; payload: null }
  >;
} = {
  GET: handleGetRequest,
  DELETE: handleDeleteRequest,
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IEmployeeData | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IEmployeeData | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IEmployeeData | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

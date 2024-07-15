import type { NextApiRequest, NextApiResponse } from 'next';
import { ISalary } from '@/interfaces/salary';
import {
  ISalaryRecord,
  ISalaryRecordWithProjects,
  ISalaryRecordWithProjectsAndHours,
} from '@/interfaces/salary_record';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';
import { getSalaryRecordById, updateSalaryRecordById } from '@/lib/utils/repo/salary_record.repo';

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  return !!admin;
}

function checkInput(
  startDate: number,
  endDate: number,
  department: string,
  name: string,
  salary: number,
  bonus: number,
  insurancePayment: number,
  description: string,
  workingHours: number,
  projects: {
    id: number;
    name: string;
    hours: number;
  }[]
): boolean {
  return (
    startDate !== undefined &&
    endDate !== undefined &&
    department !== undefined &&
    name !== undefined &&
    salary !== undefined &&
    bonus !== undefined &&
    insurancePayment !== undefined &&
    description !== undefined &&
    workingHours !== undefined &&
    Array.isArray(projects) &&
    projects.every(
      (project) => project.id !== undefined && project.name !== undefined && project.hours !== undefined
    )
  );
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISalaryRecordWithProjects | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISalaryRecordWithProjects | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuth(userId, companyId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const salaryIdNum = Number(req.query.salaryId);
    const salaryRecord = await getSalaryRecordById(salaryIdNum, companyId);
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = salaryRecord;
  }
  return { statusMessage, payload };
}

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISalaryRecordWithProjectsAndHours | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISalaryRecordWithProjectsAndHours | null = null;

  const {
    startDate,
    endDate,
    department,
    name,
    salary,
    bonus,
    insurancePayment,
    description,
    workingHours,
    projects,
  }: {
    startDate: number;
    endDate: number;
    department: string;
    name: string;
    salary: number;
    bonus: number;
    insurancePayment: number;
    description: string;
    workingHours: number;
    projects: {
      id: number;
      name: string;
      hours: number;
    }[];
  } = req.body;
  const isValid = checkInput(
    startDate,
    endDate,
    department,
    name,
    salary,
    bonus,
    insurancePayment,
    description,
    workingHours,
    projects
  );
  if (!isValid) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await checkAuth(userId, companyId);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const salaryIdNum = Number(req.query.salaryId);
      const updatedSalaryRecord = await updateSalaryRecordById(
        salaryIdNum,
        companyId,
        startDate,
        endDate,
        department,
        name,
        salary,
        bonus,
        insurancePayment,
        description,
        workingHours,
        projects
      );
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      payload = updatedSalaryRecord;
    }
  }
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload:
      | ISalary
      | ISalary[]
      | ISalaryRecord
      | ISalaryRecord[]
      | ISalaryRecordWithProjects
      | ISalaryRecordWithProjectsAndHours
      | null;
  }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<
      | ISalary
      | ISalary[]
      | ISalaryRecord
      | ISalaryRecord[]
      | ISalaryRecordWithProjects
      | ISalaryRecordWithProjectsAndHours
      | null
    >
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload:
    | ISalary
    | ISalary[]
    | ISalaryRecord
    | ISalaryRecord[]
    | ISalaryRecordWithProjects
    | ISalaryRecordWithProjectsAndHours
    | null = null;
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
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<
      | ISalary
      | ISalary[]
      | ISalaryRecord
      | ISalaryRecord[]
      | ISalaryRecordWithProjects
      | ISalaryRecordWithProjectsAndHours
      | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

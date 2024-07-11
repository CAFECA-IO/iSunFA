import type { NextApiRequest, NextApiResponse } from 'next';
import { ISalary } from '@/interfaces/salary';
import { ISalaryRecord } from '@/interfaces/salary_record';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { isUserAdmin } from '@/lib/utils/auth_check';
import {
  createSalaryRecord,
  getSalaryRecordsList,
  updateSalaryRecordsConfirmed,
} from '@/lib/utils/repo/salary_record.repo';

function checkInput(
  type: string,
  frequency: string,
  startDate: number,
  endDate: number,
  employeeIdList: number[],
  description: string
): boolean {
  return (
    !!type &&
    !!frequency &&
    !!startDate &&
    !!endDate &&
    Array.isArray(employeeIdList) &&
    employeeIdList.every((id) => typeof id === 'number') &&
    !!description
  );
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISalaryRecord | ISalaryRecord[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISalaryRecord | ISalaryRecord[] | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await isUserAdmin(userId, companyId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const salaryRecordsLists = await getSalaryRecordsList(companyId);
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = salaryRecordsLists;
  }
  return { statusMessage, payload };
}

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISalaryRecord | ISalaryRecord[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISalaryRecord | ISalaryRecord[] | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await isUserAdmin(userId, companyId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const confirmedSalaryRecordsLists = await updateSalaryRecordsConfirmed(companyId);
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = confirmedSalaryRecordsLists;
  }
  return { statusMessage, payload };
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISalaryRecord | ISalaryRecord[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISalaryRecord[] | ISalaryRecord | null = null;

  const { type, frequency, startDate, endDate, employeeIdList, description } = req.body;
  const isValid = checkInput(type, frequency, startDate, endDate, employeeIdList, description);
  if (!isValid) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await isUserAdmin(userId, companyId);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const newSalaryRecords = await createSalaryRecord(
        type,
        frequency,
        startDate,
        endDate,
        employeeIdList,
        description
      );
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = newSalaryRecords;
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
    payload: ISalary | ISalary[] | ISalaryRecord | ISalaryRecord[] | null;
  }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISalary | ISalary[] | ISalaryRecord | ISalaryRecord[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISalary | ISalary[] | ISalaryRecord | ISalaryRecord[] | null = null;
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
      ISalary | ISalary[] | ISalaryRecord | ISalaryRecord[] | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

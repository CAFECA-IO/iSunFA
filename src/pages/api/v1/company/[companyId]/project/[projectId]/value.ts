import { NextApiRequest, NextApiResponse } from 'next';
import { IValue } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, convertStringToNumber } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getProjectValue } from '@/lib/utils/repo/value.repo';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getSession } from '@/lib/utils/session';

async function checkInput(projectId: string) {
  let isValid = true;
  if (!projectId) {
    isValid = false;
  }
  return isValid;
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IValue | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IValue | null = null;

  const { projectId } = req.query;
  const isValidInput = await checkInput(projectId as string);
  if (!isValidInput) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const projectIdNum = convertStringToNumber(projectId);
    const isAuth = await checkAuthorization(
      [AuthFunctionsKeys.admin, AuthFunctionsKeys.projectCompanyMatch],
      { userId, companyId, projectId: projectIdNum }
    );
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      try {
        const projectValue: IValue | null = await getProjectValue(projectIdNum);
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        payload = projectValue;
      } catch (error) {
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IValue | null>>
  ) => Promise<{ statusMessage: string; payload: IValue | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IValue | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IValue | null = null;

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
    const { httpCode, result } = formatApiResponse<IValue | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

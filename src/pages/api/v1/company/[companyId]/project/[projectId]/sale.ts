import { NextApiRequest, NextApiResponse } from 'next';
import { ISale } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { listProjectSale } from '@/lib/utils/repo/sale.repo';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getSession } from '@/lib/utils/session';

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<ISale[]>>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISale[] = [];

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const { projectId } = req.query;
    const projectIdNum = Number(projectId);
    if (projectIdNum > 0) {
      const isAuth = await checkAuthorization(
        [AuthFunctionsKeys.admin, AuthFunctionsKeys.projectCompanyMatch],
        { userId, companyId, projectId: projectIdNum }
      );
      if (!isAuth) {
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
      } else {
        try {
          const projectSale = await listProjectSale(projectIdNum);
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          payload = projectSale;
        } catch (error) {
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        }
      }
    } else {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<ISale[]>>
  ) => Promise<{ statusMessage: string; payload: ISale[] }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISale[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISale[] = [];

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
    payload = [];
  } finally {
    const { httpCode, result } = formatApiResponse<ISale[]>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

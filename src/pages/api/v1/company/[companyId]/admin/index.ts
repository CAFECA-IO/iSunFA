import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IAdmin } from '@/interfaces/admin';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { listAdminByCompanyId } from '@/lib/utils/repo/admin.repo';
import { formatAdminList } from '@/lib/utils/formatter/admin.formatter';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin[] = [];

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const listedAdmin = await listAdminByCompanyId(companyId);
      const adminList = await formatAdminList(listedAdmin);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      payload = adminList;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAdmin[] }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin[] = [];

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
    const { httpCode, result } = formatApiResponse<IAdmin[]>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

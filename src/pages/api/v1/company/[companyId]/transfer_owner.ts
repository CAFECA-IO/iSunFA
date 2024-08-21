import { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, convertStringToNumber } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatAdminList } from '@/lib/utils/formatter/admin.formatter';
import { getSession } from '@/lib/utils/session';
import { transferOwnership } from '@/lib/utils/repo/transaction/admin_role.tx';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin[] | null = null;

  const { newOwnerId } = req.body;
  const newOwnerIdNum = convertStringToNumber(newOwnerId);
  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], { userId, companyId });

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const updatedAdmin = await transferOwnership(userId, companyId, newOwnerIdNum);
      const admin = await formatAdminList(updatedAdmin);
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      payload = admin;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAdmin[] | null }>;
} = {
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin[] | null = null;

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
    const { httpCode, result } = formatApiResponse<IAdmin[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

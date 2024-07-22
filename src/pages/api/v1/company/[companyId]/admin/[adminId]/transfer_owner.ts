import { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, convertStringToNumber } from '@/lib/utils/common';
import { checkCompanyAdminMatch } from '@/lib/utils/auth_check';
import { formatAdminList } from '@/lib/utils/formatter/admin.formatter';
import { getSession } from '@/lib/utils/session';
import { transferOwnership } from '@/lib/utils/repo/transaction/admin_role.tx';

async function handlePutRequest(req: NextApiRequest, res: NextApiResponse) {
  const { adminId } = req.query;
  const adminIdNum = convertStringToNumber(adminId);
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkCompanyAdminMatch({ companyId, adminId: adminIdNum });
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const updatedAdmin = await transferOwnership(userId, companyId, adminIdNum);
  const admin = await formatAdminList(updatedAdmin);
  return { statusMessage: STATUS_MESSAGE.SUCCESS_UPDATE, payload: admin };
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
  let payload: IAdmin | IAdmin[] | null = null;

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

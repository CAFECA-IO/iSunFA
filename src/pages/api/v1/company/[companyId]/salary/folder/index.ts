import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';
import { getFolderList } from '@/lib/utils/repo/folder.repo';
import { IFolder } from '@/interfaces/folder';

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  return !!admin;
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFolder | IFolder[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFolder | IFolder[] | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuth(userId, companyId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const folderList = await getFolderList(companyId);
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = folderList;
  }
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: IFolder | IFolder[] | null;
  }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFolder | IFolder[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFolder | IFolder[] | null = null;
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
    const { httpCode, result } = formatApiResponse<IFolder | IFolder[] | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}

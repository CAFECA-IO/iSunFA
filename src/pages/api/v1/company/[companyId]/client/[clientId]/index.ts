import { NextApiRequest, NextApiResponse } from 'next';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { deleteClientById, getClientById, updateClientById } from '@/lib/utils/repo/client.repo';
import { getSession } from '@/lib/utils/session';
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  return !!admin;
}
// Info: (20240705 - Jacky) 分離的處理函數
async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | IClient[] | null = null;
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuth(userId, companyId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const clientIdNum = Number(req.query.clientId);
    const getClient = await getClientById(clientIdNum);
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = getClient;
  }
  return { statusMessage, payload };
}

async function handlePutRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | IClient[] | null = null;
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuth(userId, companyId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const clientIdNum = Number(req.query.clientId);
    const { name, taxId, favorite } = req.body;
    const updatedClient = await updateClientById(clientIdNum, name, taxId, favorite);
    statusMessage = updatedClient
      ? STATUS_MESSAGE.SUCCESS_UPDATE
      : STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    payload = updatedClient;
  }
  return { statusMessage, payload };
}

async function handleDeleteRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | IClient[] | null = null;
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuth(userId, companyId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const clientIdNum = Number(req.query.clientId);
    const deletedClient = await deleteClientById(clientIdNum);
    statusMessage = deletedClient
      ? STATUS_MESSAGE.SUCCESS_DELETE
      : STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    payload = deletedClient;
  }
  return { statusMessage, payload };
}

// Info: (20240705 - Jacky) 映射 HTTP 方法到處理函數
const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IClient | IClient[] | null }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient | IClient[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | IClient[] | null = null;

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
    const { httpCode, result } = formatApiResponse<IClient | IClient[] | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}

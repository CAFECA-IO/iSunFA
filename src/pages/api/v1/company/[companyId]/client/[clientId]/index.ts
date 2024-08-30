import { NextApiRequest, NextApiResponse } from 'next';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { deleteClientById, getClientById, updateClientById } from '@/lib/utils/repo/client.repo';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | null = null;

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
      const clientIdNum = convertStringToNumber(req.query.clientId);
      const getClient = await getClientById(clientIdNum);
      if (!getClient) {
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      } else {
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        payload = getClient;
      }
    }
  }

  return { statusMessage, payload };
}

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | null = null;

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
      const clientIdNum = convertStringToNumber(req.query.clientId);
      const { name, taxId, favorite } = req.body;
      const updatedClient = await updateClientById(clientIdNum, name, taxId, favorite);
      if (!updatedClient) {
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      } else {
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = updatedClient;
      }
    }
  }

  return { statusMessage, payload };
}

async function handleDeleteRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | null = null;

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
      const clientIdNum = convertStringToNumber(req.query.clientId);
      const deletedClient = await deleteClientById(clientIdNum);
      if (!deletedClient) {
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      } else {
        statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        payload = deletedClient;
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IClient | null }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | null = null;

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
    const { httpCode, result } = formatApiResponse<IClient | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

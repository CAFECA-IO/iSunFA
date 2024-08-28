import { NextApiRequest, NextApiResponse } from 'next';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { createClient, listClient } from '@/lib/utils/repo/client.repo';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';

function checkInput(name: string, taxId: string, favorite: boolean): boolean {
  return !!name && !!taxId && typeof favorite === 'boolean';
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient | IClient[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | IClient[] | null = null;

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
      const clientList = await listClient(companyId);
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
      payload = clientList;
    }
  }

  return { statusMessage, payload };
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient | IClient[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IClient | IClient[] | null = null;

  const { name, taxId, favorite } = req.body;
  const isValid = checkInput(name, taxId, favorite);

  if (!isValid) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
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
        const newClient = await createClient(companyId, name, taxId, favorite);
        statusMessage = STATUS_MESSAGE.CREATED;
        payload = newClient;
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IClient | IClient[] | null }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
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

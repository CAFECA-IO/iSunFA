import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IContract, newDummyContracts } from '@/interfaces/contract';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IContract[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IContract[] | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId || !companyId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], {
      userId,
      companyId,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      // ToDo: (20240828 - Jacky) Implement list contract function
      const contractList = newDummyContracts;
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
      payload = contractList;
    }
  }

  return { statusMessage, payload };
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IContract | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IContract | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId || !companyId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], {
      userId,
      companyId,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      // ToDo: (20240828 - Jacky) Implement create contract function
      const contract: IContract = newDummyContracts[0];
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = contract;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IContract | IContract[] | null }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IContract | IContract[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IContract | IContract[] | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    // ToDo: (20240828 - Jacky) Log error message to log file
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IContract | IContract[] | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}

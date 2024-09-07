import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IAsset, mockAssetData } from '@/interfaces/asset';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAsset[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAsset[] | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId || !companyId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], {
      userId,
      companyId,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      payload = mockAssetData;
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    }
  }

  return { statusMessage, payload };
}

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAsset | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAsset | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId || !companyId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], {
      userId,
      companyId,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      [payload] = mockAssetData;
      statusMessage = STATUS_MESSAGE.CREATED;
    }
  }

  return { statusMessage, payload };
}

async function handleDeleteRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAsset | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAsset | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId || !companyId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], {
      userId,
      companyId,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      [payload] = mockAssetData;
      statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAsset | IAsset[] | null }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAsset | IAsset[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAsset | IAsset[] | null = null;

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
    const { httpCode, result } = formatApiResponse<IAsset | IAsset[] | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { exportPublicKey, getPublicKeyByCompany } from '@/lib/utils/crypto';
import loggerBack from '@/lib/utils/logger_back';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<JsonWebKey | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let payload: JsonWebKey | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      try {
        const publicCryptoKey = await getPublicKeyByCompany(companyId);
        if (publicCryptoKey) {
          payload = await exportPublicKey(publicCryptoKey);
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        } else {
          statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
        }
      } catch (error) {
        loggerBack.error(error);
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<JsonWebKey | null>>
  ) => Promise<{ statusMessage: string; payload: JsonWebKey | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<JsonWebKey | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: JsonWebKey | null = null;

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
    loggerBack.error(error);
  } finally {
    const { httpCode, result } = formatApiResponse<JsonWebKey | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

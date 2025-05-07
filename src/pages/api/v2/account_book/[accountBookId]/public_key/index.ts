import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { exportPublicKey, getPublicKeyByCompany } from '@/lib/utils/crypto';
import loggerBack from '@/lib/utils/logger_back';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';

/**
 * Info: (20250505 - Shirley) Handle GET request for public key
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Fetch public key for the account book
 * 5. Validate output data
 * 6. Return formatted response
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: JsonWebKey | null = null;

  await checkSessionUser(session, APIName.PUBLIC_KEY_GET, req);
  await checkUserAuthorization(APIName.PUBLIC_KEY_GET, req, session);

  // Info: (20250505 - Shirley) 驗證請求資料
  const { query } = checkRequestData(APIName.PUBLIC_KEY_GET, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountBookId } = query;

  loggerBack.info(`User: ${userId} retrieving public key for accountBookId: ${accountBookId}`);

  try {
    const publicCryptoKey = await getPublicKeyByCompany(accountBookId);

    if (publicCryptoKey) {
      const publicKey = await exportPublicKey(publicCryptoKey);

      // Info: (20250505 - Shirley) 驗證輸出資料
      const { isOutputDataValid, outputData } = validateOutputData(
        APIName.PUBLIC_KEY_GET,
        publicKey
      );

      if (!isOutputDataValid) {
        statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
      } else {
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        payload = outputData;
      }
    } else {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    }
  } catch (error) {
    loggerBack.error({
      message: 'Error retrieving public key',
      error,
      userId,
      accountBookId,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**
 * Info: (20250505 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 * 4. Log user action
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<JsonWebKey | null>>
) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const apiName: APIName = APIName.PUBLIC_KEY_GET;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    loggerBack.error({
      userId: session.userId || -1,
      errorType: err.name,
      errorMessage: err.message,
    });
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}

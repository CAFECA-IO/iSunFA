import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ProgressStatus } from '@/constants/account';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { isProgressStatus } from '@/lib/utils/type_guard/account';
import { AICH_URI } from '@/constants/config';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { getSession } from '@/lib/utils/session';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';

/**
 * Info: (20250505 - Shirley) Handle GET request for AI processing status
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Fetch status from AI service
 * 5. Validate output data
 * 6. Return formatted response
 */
async function handleGetRequest(req: NextApiRequest) {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ProgressStatus | null = null;

  await checkSessionUser(session, APIName.ASK_AI_STATUS, req);
  await checkUserAuthorization(APIName.ASK_AI_STATUS, req, session);

  // Info: (20250505 - Shirley) 驗證請求資料
  const { query } = checkRequestData(APIName.ASK_AI_STATUS, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { resultId, aiApi = 'vouchers' } = query;
  if (typeof resultId !== 'string' || !resultId || Array.isArray(resultId)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  loggerBack.info(
    `User: ${userId} checking AI process status for resultId: ${resultId}, aiApi: ${aiApi}`
  );

  try {
    // Info: (20250505 - Shirley) 從 AI 服務取得處理進度
    const fetchResult = await fetch(`${AICH_URI}/api/v1/${aiApi}/${resultId}/process_status`);

    if (fetchResult.status === 404) {
      statusMessage = STATUS_MESSAGE.AICH_API_NOT_FOUND;
    } else if (!fetchResult.ok) {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED;
    } else {
      const resultJson: ProgressStatus = (await fetchResult.json()).payload;

      if (!resultJson || !isProgressStatus(resultJson)) {
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_DATA_FROM_AICH_IS_INVALID_TYPE;
      } else {
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;

        // Info: (20250505 - Shirley) 驗證輸出資料
        const { isOutputDataValid, outputData } = validateOutputData(
          APIName.ASK_AI_STATUS,
          resultJson
        );

        if (!isOutputDataValid) {
          statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
        } else {
          payload = outputData;
        }
      }
    }
  } catch (error) {
    loggerBack.error({
      message: 'Error fetching AI process status',
      error,
      resultId,
      aiApi,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
}

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
  res: NextApiResponse<IResponseData<ProgressStatus | null>>
) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const apiName: APIName = APIName.ASK_AI_STATUS;
  const session = await getSession(req);

  try {
    // Info: (20250505 - Shirley) Handle different HTTP methods
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

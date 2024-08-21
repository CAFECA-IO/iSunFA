import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ProgressStatus } from '@/constants/account';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { isProgressStatus } from '@/lib/utils/type_guard/account';
import { AICH_URI } from '@/constants/config';

async function handleGetRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ProgressStatus | null = null;
  const { resultId, aiApi = 'vouchers' } = req.query;

  if (typeof resultId !== 'string' || !resultId || Array.isArray(resultId)) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    try {
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
          payload = resultJson;
        }
      }
    } catch (error) {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ProgressStatus | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ProgressStatus | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ProgressStatus | null = null;

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
    const { httpCode, result } = formatApiResponse<ProgressStatus | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

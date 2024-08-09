import type { NextApiRequest, NextApiResponse } from 'next';
import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ProgressStatus } from '@/constants/account';
import { isProgressStatus } from '@/lib/utils/type_guard/account';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ProgressStatus>>
) {
  try {
    const { resultId, aiApi = 'vouchers' } = req.query;

    // Info Murky (20240416): Check if resultId is string
    if (typeof resultId !== 'string' || !resultId || Array.isArray(resultId)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    switch (req.method) {
      case 'GET': {
        const fetchResult = await fetch(`${AICH_URI}/api/v1/${aiApi}/${resultId}/process_status`);

        if (fetchResult.status === 404) {
          throw new Error(STATUS_MESSAGE.AICH_API_NOT_FOUND);
        }

        if (!fetchResult.ok) {
          throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
        }

        const resultJson: ProgressStatus = (await fetchResult.json()).payload;

        if (!resultJson || !isProgressStatus(resultJson)) {
          throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_DATA_FROM_AICH_IS_INVALID_TYPE);
        }

        const { httpCode, result } = formatApiResponse<ProgressStatus>(
          STATUS_MESSAGE.SUCCESS_GET,
          resultJson
        );
        res.status(httpCode).json(result);
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ProgressStatus>(
      error.message,
      {} as ProgressStatus
    );
    res.status(httpCode).json(result);
  }
}

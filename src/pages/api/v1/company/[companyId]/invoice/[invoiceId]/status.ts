// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { ProgressStatus } from '@/interfaces/account';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ProgressStatus>>
) {
  try {
    const { invoiceId } = req.query;

    // Info Murky (20240416): Check if invoiceId is string
    if (Array.isArray(invoiceId) || !invoiceId || typeof invoiceId !== 'string') {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    switch (req.method) {
      case 'GET': {
        const result = await fetch(`${AICH_URI}/api/v1/ocr/${invoiceId}/process_status`);

        if (!result.ok) {
          throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
        }

        const resultJson: ProgressStatus = (await result.json()).payload;
        const { httpCode, result: response } = formatApiResponse<ProgressStatus>(
          STATUS_MESSAGE.SUCCESS_GET,
          resultJson
        );
        res.status(httpCode).json(response);
        break;
      }
      default: {
        throw new Error('METHOD_NOT_ALLOWED');
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

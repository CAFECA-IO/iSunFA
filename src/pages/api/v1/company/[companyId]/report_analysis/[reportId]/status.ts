import type { NextApiRequest, NextApiResponse } from 'next';
import { ProgressStatus } from '@/constants/account';
import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
// import { RESPONSE_STATUS_MESSAGE } from '@/constants/STATUS_MESSAGE';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ProgressStatus>>
) {
  try {
    const { reportId } = req.query;

    // Info Murky (20240416): Check if resultId is string
    if (typeof reportId !== 'string' || !reportId || Array.isArray(reportId)) {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }

    switch (req.method) {
      case 'GET': {
        const fetchResult = await fetch(
          `${AICH_URI}/api/v1/audit_reports/${reportId}/process_status`
        );

        if (!fetchResult.ok) {
          throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
        }

        const resultJson: ProgressStatus = (await fetchResult.json()).payload;

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

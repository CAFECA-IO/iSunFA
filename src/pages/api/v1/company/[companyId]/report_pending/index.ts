import type { NextApiRequest, NextApiResponse } from 'next';
import { IPendingReportItem, FIXED_DUMMY_PENDING_REPORT_ITEMS } from '@/interfaces/report_item';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const pendingReportItems = FIXED_DUMMY_PENDING_REPORT_ITEMS;

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPendingReportItem[] | IPendingReportItem>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const { httpCode, result } = formatApiResponse<IPendingReportItem[]>(
      STATUS_MESSAGE.SUCCESS_GET,
      pendingReportItems
    );
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IPendingReportItem>(
      error.message,
      {} as IPendingReportItem
    );
    res.status(httpCode).json(result);
  }
}

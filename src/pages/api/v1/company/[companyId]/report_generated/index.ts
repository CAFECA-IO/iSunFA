import type { NextApiRequest, NextApiResponse } from 'next';
import { IGeneratedReportItem, FIXED_DUMMY_GENERATED_REPORT_ITEMS } from '@/interfaces/report_item';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const generatedReportItems = FIXED_DUMMY_GENERATED_REPORT_ITEMS;

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IGeneratedReportItem[] | IGeneratedReportItem>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const { httpCode, result } = formatApiResponse<IGeneratedReportItem[]>(
      STATUS_MESSAGE.SUCCESS_GET,
      generatedReportItems
    );
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IGeneratedReportItem>(
      error.message,
      {} as IGeneratedReportItem
    );
    res.status(httpCode).json(result);
  }
}

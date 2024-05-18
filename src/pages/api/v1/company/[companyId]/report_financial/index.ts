import type { NextApiRequest, NextApiResponse } from 'next';
import { IFinancialReport } from '@/interfaces/report';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';

const mockFinancialReportUrl: IFinancialReport = 'http://www.google.com.br';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFinancialReport | null>>
) {
  try {
    switch (req.method) {
      case 'GET': {
        const { type } = req.query;
        const { language } = req.query;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;

        if (
          !type ||
          !language ||
          !startDate ||
          !endDate ||
          typeof type !== 'string' ||
          typeof language !== 'string' ||
          typeof startDate !== 'string' ||
          typeof endDate !== 'string' ||
          (type !== 'Balance Sheet' &&
            type !== 'Income Statement' &&
            type !== 'Cash Flow Statement')
        ) {
          throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
        }

        const { httpCode, result } = formatApiResponse<IFinancialReport>(
          STATUS_MESSAGE.CREATED,
          mockFinancialReportUrl
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
    const { httpCode, result } = formatApiResponse<IFinancialReport>(
      error.message,
      {} as IFinancialReport
    );
    res.status(httpCode).json(result);
  }
}

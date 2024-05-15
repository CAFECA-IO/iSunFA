import type { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFinancialReportsProgreseStatusResponse } from '@/interfaces/report';
import { formatApiResponse } from '@/lib/utils/common';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFinancialReportsProgreseStatusResponse[] | null>>
) {
  try {
    const { companyId } = req.query;
    if (!companyId || typeof companyId !== 'string') {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    switch (req.method) {
      case 'GET': {
        const mockResponse: IFinancialReportsProgreseStatusResponse[] = [];
        const { httpCode, result } = formatApiResponse<IFinancialReportsProgreseStatusResponse[]>(
          STATUS_MESSAGE.SUCCESS_GET,
          mockResponse
        );
        res.status(httpCode).json(result);
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
        break;
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IFinancialReportsProgreseStatusResponse[]>(
      error.message,
      {} as IFinancialReportsProgreseStatusResponse[]
    );
    res.status(httpCode).json(result);
  }
}

import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { NextApiRequest, NextApiResponse } from 'next';
import { IFinancialReportJSON } from '@/interfaces/financial_report';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { isIFinancialReportJSON } from '@/lib/utils/type_guard/financial_report';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFinancialReportJSON>>
) {
  try {
    if (req.method === 'GET') {
      if (!req.query.reportId) {
        throw new Error('INVALID_INPUT_PARAMETER');
      }

      const fetchResult = await fetch(
        `${AICH_URI}/api/v1/audit_reports/${req.query.reportId}/result`
      );

      if (!fetchResult.ok) {
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
      }

      const resultJson: IFinancialReportJSON = (await fetchResult.json()).payload;
      if (!isIFinancialReportJSON(resultJson)) {
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_DATA_FROM_AICH_IS_INVALID_TYPE);
      }
      const { httpCode, result } = formatApiResponse<IFinancialReportJSON>(
        STATUS_MESSAGE.SUCCESS_GET,
        resultJson
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error('METHOD_NOT_ALLOWED');
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IFinancialReportJSON>(
      error.message,
      {} as IFinancialReportJSON
    );
    res.status(httpCode).json(result);
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { IAnalysisReport, isIAnalysisReportRequest } from '@/interfaces/report';
import { IResponseData } from '@/interfaces/response_data';
import { AICH_URI } from '@/constants/config';

import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { isIFinancialStatements } from '@/lib/utils/type_guard/financial_report';

const mockAnalysisReportUrl: IAnalysisReport = 'http://www.google.com.br';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAnalysisReport | IAccountResultStatus>>
) {
  try {
    switch (req.method) {
      case 'GET': {
        const {
          type,
          language,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          start_date,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          end_date,
        } = req.query;

        if (
          !type ||
          Array.isArray(type) ||
          !language ||
          Array.isArray(language) ||
          !start_date ||
          Array.isArray(start_date) ||
          !end_date ||
          Array.isArray(end_date)
        ) {
          throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
        }

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        if (!isIAnalysisReportRequest({ type, language, startDate, endDate })) {
          throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
        }

        // Financial Performance / Cost Analysis / HR Utilization / Forecast Report
        if (
          type !== 'Financial Performance' &&
          type !== 'Cost Analysis' &&
          type !== 'HR Utilization' &&
          type !== 'Forecast Report'
        ) {
          throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
        }
        const { httpCode, result } = formatApiResponse<IAnalysisReport>(
          STATUS_MESSAGE.SUCCESS_GET,
          mockAnalysisReportUrl
        );
        res.status(httpCode).json(result);

        break;
      }
      case 'POST': {
        const { body } = req;

        if (!isIFinancialStatements(body)) {
          throw new Error('INVALID_INPUT_PARAMETER');
        }

        const fetchResult = await fetch(`${AICH_URI}/api/v1/audit_reports`, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!fetchResult.ok) {
          throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
        }

        const resultJson: IAccountResultStatus = (await fetchResult.json()).payload;
        const { httpCode, result } = formatApiResponse<IAccountResultStatus>(
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
    const { httpCode, result } = formatApiResponse<IAnalysisReport>(
      error.message,
      {} as IAnalysisReport
    );
    res.status(httpCode).json(result);
  }
}

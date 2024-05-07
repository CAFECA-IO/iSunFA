import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { IAnalysisReport, isIAnalysisReportRequest } from '@/interfaces/report';
import { IResponseData } from '@/interfaces/response_data';
import { isIFinancialStatements } from '@/interfaces/financial_report';
import { AICH_URI } from '@/constants/config';
import { AccountResultStatus } from '@/interfaces/account';
import { RESPONSE_STATUS_CODE } from '@/constants/status_code';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';

const mockAnalysisReportUrl: IAnalysisReport = 'http://www.google.com.br';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAnalysisReport>>
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
          res.status(400).json({
            powerby: 'iSunFA v' + version,
            success: false,
            code: '400',
            message: 'bad request',
            payload: null,
          });
          return;
        }

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        if (!isIAnalysisReportRequest({ type, language, startDate, endDate })) {
          res.status(400).json({
            powerby: 'iSunFA v' + version,
            success: false,
            code: '400',
            message: 'bad request',
            payload: null,
          });
          return;
        }

        // Financial Performance / Cost Analysis / HR Utilization / Forecast Report
        if (
          type !== 'Financial Performance' &&
          type !== 'Cost Analysis' &&
          type !== 'HR Utilization' &&
          type !== 'Forecast Report'
        ) {
          res.status(400).json({
            powerby: 'iSunFA v' + version,
            success: false,
            code: '400',
            message: 'bad request',
            payload: null,
          });
          return;
        }
        res.status(200).json({
          powerby: 'iSunFA v' + version,
          success: true,
          code: '200',
          message: 'request successful',
          payload: mockAnalysisReportUrl,
        });

        break;
      }
      case 'POST': {
        const { body } = req;

        if (!isIFinancialStatements(body)) {
          throw new Error('INVALID_INPUT_PARAMETER');
        }

        const result = await fetch(`${AICH_URI}/api/v1/audit_reports`, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!result.ok) {
          throw new Error('GATEWAY_TIMEOUT');
        }

        const resultJson: AccountResultStatus = (await result.json()).payload;

        res.status(RESPONSE_STATUS_CODE.success).json({
          powerby: 'iSunFA v' + version,
          success: true,
          code: String(RESPONSE_STATUS_CODE.success),
          message: 'request successful',
          payload: resultJson,
        });
        break;
      }
      default: {
        break;
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}

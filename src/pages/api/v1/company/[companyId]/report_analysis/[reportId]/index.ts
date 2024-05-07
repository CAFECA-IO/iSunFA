import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { RESPONSE_STATUS_CODE } from '@/constants/status_code';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';
import { IFinancialReportJSON, isIFinancialReportJSON } from '@/interfaces/financial_report';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFinancialReportJSON>>
) {
  try {
    if (req.method === 'GET') {
      if (!req.query.reportId) {
        throw new Error('INVALID_INPUT_PARAMETER');
      }

      const result = await fetch(`${AICH_URI}/api/v1/vouchers/${req.query.reportId}/result`);

      if (!result.ok) {
        throw new Error('GATEWAY_TIMEOUT');
      }

      const financialReportJSON = (await result.json()).payload;

      if (!isIFinancialReportJSON(financialReportJSON)) {
        throw new Error('INTERNAL_SERVICE_ERROR');
      }

      res.status(RESPONSE_STATUS_CODE.success).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: String(RESPONSE_STATUS_CODE.success),
        message: 'get voucher analyzation result by id',
        payload: financialReportJSON,
      });
    } else {
      throw new Error('METHOD_NOT_ALLOWED');
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

// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountInvoiceData } from '@/interfaces/account';
import version from '@/lib/version';
import { AICH_URI } from '@/constants/config';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import { IResponseData } from '@/interfaces/response_data';
import { responseStatusCode } from '@/lib/utils/status_code';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<AccountInvoiceData[]>>
) {
  try {
    const { resultId } = req.query;
    // Info Murky (20240416): Check if resultId is string
    if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
      throw new Error('Invalid input parameter');
    }

    switch (req.method) {
      case 'GET': {
        const result = await fetch(`${AICH_URI}/api/v1/ocr/${resultId}/result`);

        if (!result.ok) {
          throw new Error('Gateway Timeout');
        }

        const ocrResultData: AccountInvoiceData = (await result.json()).payload;

        res.status(responseStatusCode.success).json({
          powerby: `ISunFa api ${version}`,
          success: true,
          code: String(responseStatusCode.success),
          message: `OCR analyzing result of id:${resultId} return successfully`,
          payload: [ocrResultData],
        });
        break;
      }
      default: {
        throw new Error('Method Not Allowed');
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}

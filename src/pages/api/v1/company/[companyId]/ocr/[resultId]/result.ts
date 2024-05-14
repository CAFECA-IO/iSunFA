// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountInvoiceData } from '@/interfaces/account';
import version from '@/lib/version';
import { AICH_URI } from '@/constants/config';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';
// import { RESPONSE_STATUS_MESSAGE } from '@/constants/STATUS_MESSAGE';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<AccountInvoiceData[]>>
) {
  try {
    const { resultId } = req.query;
    // Info Murky (20240416): Check if resultId is string
    if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
      throw new Error('INVALID_INPUT_PARAMETER');
    }

    switch (req.method) {
      case 'GET': {
        const result = await fetch(`${AICH_URI}/api/v1/ocr/${resultId}/result`);

        if (!result.ok) {
          throw new Error('GATEWAY_TIMEOUT');
        }

        const ocrResultData: AccountInvoiceData = (await result.json()).payload;
        // ToDo: (20240514 - Jacky) Should use uniform response handler
        res.status(200).json({
          powerby: `ISunFa api ${version}`,
          success: true,
          code: String(200),
          message: `OCR analyzing result of id:${resultId} return successfully`,
          payload: [ocrResultData],
        });
        break;
      }
      default: {
        throw new Error('METHOD_NOT_ALLOWED');
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

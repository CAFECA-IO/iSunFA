// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { AICH_URI } from '@/constants/config';
import { RESPONSE_STATUS_CODE } from '@/constants/status_code';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';
import { ProgressStatus } from '@/interfaces/common';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ProgressStatus>>
) {
  try {
    const { invoiceId } = req.query;

    // Info Murky (20240416): Check if invoiceId is string
    if (Array.isArray(invoiceId) || !invoiceId || typeof invoiceId !== 'string') {
      throw new Error('INVALID_INPUT_PARAMETER');
    }

    switch (req.method) {
      case 'GET': {
        const result = await fetch(`${AICH_URI}/api/v1/ocr/${invoiceId}/process_status`);

        if (!result.ok) {
          throw new Error('GATEWAY_TIMEOUT');
        }

        const resultJson: ProgressStatus = (await result.json()).payload;

        res.status(RESPONSE_STATUS_CODE.success).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: String(RESPONSE_STATUS_CODE.success),
          message: `OCR analyzing progress status of id:${invoiceId} return successfully`,
          payload: resultJson,
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

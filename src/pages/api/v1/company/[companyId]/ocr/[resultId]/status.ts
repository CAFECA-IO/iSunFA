// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountProgressStatus } from '@/interfaces/account';
import version from '@/lib/version';
import { AICH_URI } from '@/constants/config';
// import { RESPONSE_STATUS_CODE } from '@/constants/status_code';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<AccountProgressStatus>>
) {
  try {
    const { resultId } = req.query;

    // Info Murky (20240416): Check if resultId is string
    if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
      throw new Error('INVALID_INPUT_PARAMETER');
    }

    switch (req.method) {
      case 'GET': {
        const result = await fetch(`${AICH_URI}/api/v1/ocr/${resultId}/process_status`);

        if (!result.ok) {
          throw new Error('GATEWAY_TIMEOUT');
        }

        const resultJson: AccountProgressStatus = (await result.json()).payload;
        // ToDo: (20240514 - Jacky) Should use uniform response handler
        res.status(200).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: String(200),
          message: `OCR analyzing progress status of id:${resultId} return successfully`,
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

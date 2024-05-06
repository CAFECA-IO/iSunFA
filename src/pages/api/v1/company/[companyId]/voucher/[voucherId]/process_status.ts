import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountProgressStatus } from '@/interfaces/account';
import version from '@/lib/version';
import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { responseStatusCode } from '@/lib/utils/status_code';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<AccountProgressStatus>>
) {
  try {
    const { voucherId } = req.query;

    // Info Murky (20240416): Check if resultId is string
    if (typeof voucherId !== 'string' || !voucherId || Array.isArray(voucherId)) {
      throw new Error('Invalid input parameter');
    }

    switch (req.method) {
      case 'GET': {
        const result = await fetch(`${AICH_URI}/api/v1/vouchers/${voucherId}/process_status`);

        if (!result.ok) {
          throw new Error('Gateway Timeout');
        }

        const resultJson: AccountProgressStatus = (await result.json()).payload;

        res.status(responseStatusCode.success).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: String(responseStatusCode.success),
          message: `Voucher preview creating process of id:${voucherId} return successfully`,
          payload: resultJson,
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
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}

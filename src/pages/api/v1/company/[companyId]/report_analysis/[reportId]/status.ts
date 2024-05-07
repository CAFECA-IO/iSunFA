import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountProgressStatus } from '@/interfaces/account';
import version from '@/lib/version';
import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { RESPONSE_STATUS_CODE } from '@/constants/status_code';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<AccountProgressStatus>>
) {
  try {
    const { reportId } = req.query;

    // Info Murky (20240416): Check if resultId is string
    if (typeof reportId !== 'string' || !reportId || Array.isArray(reportId)) {
      throw new Error('INVALID_INPUT_PARAMETER');
    }

    switch (req.method) {
      case 'GET': {
        const result = await fetch(`${AICH_URI}/api/v1/audit_reports/${reportId}/process_status`);

        if (!result.ok) {
          throw new Error('GATEWAY_TIMEOUT');
        }

        const resultJson: AccountProgressStatus = (await result.json()).payload;

        res.status(RESPONSE_STATUS_CODE.success).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: String(RESPONSE_STATUS_CODE.success),
          message: `Financial JSON creating process of id:${reportId} return successfully`,
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
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}

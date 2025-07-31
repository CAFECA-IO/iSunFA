import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { loggerError } from '@/lib/utils/logger_back';
import { voucherAPIRestoreUtils as restoreUtils } from '@/pages/api/v2/account_book/[accountBookId]/voucher/[voucherId]/route_utils';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { assertUserCanByAccountBook } from '@/lib/utils/permission/assert_user_team_permission';

interface IHandlerResult {
  statusMessage: string;
}

interface IRestoreResult extends IHandlerResult {
  payload: number | null;
}

type IHandlerResultPayload = IRestoreResult['payload'];

interface IHandlerResponse extends IHandlerResult {
  payload: IHandlerResultPayload;
  userId?: string;
}

export const handleRestoreRequest: IHandleRequest<APIName.VOUCHER_RESTORE_V2, number> = async ({
  query,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const { userId } = session;
  const { accountBookId, voucherId } = query;

  try {
    const now = getTimestampNow();
    const { can } = await assertUserCanByAccountBook({
      userId,
      accountBookId,
      action: TeamPermissionAction.RESTORE_VOUCHER,
    });

    if (!can) {
      const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
      error.name = STATUS_CODE.PERMISSION_DENIED;
      throw error;
    }
    const restoredVoucher = await restoreUtils.restoreVoucherAndRelations({
      voucherId,
      accountBookId,
      now,
      userId,
    });

    statusMessage = STATUS_MESSAGE.SUCCESS;
    payload = restoredVoucher?.id ?? null;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: 'Voucher Restore handleRestoreRequest',
      errorMessage: error.message,
    });
    statusMessage = error.message;
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IHandlerResponse>;
} = {
  POST: (req) => withRequestValidation(APIName.VOUCHER_RESTORE_V2, req, handleRestoreRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IHandlerResultPayload>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IHandlerResultPayload = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IHandlerResultPayload>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

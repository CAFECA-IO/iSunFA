import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { loggerError } from '@/lib/utils/logger_back';
import { voucherAPIRestoreUtils as restoreUtils } from './route_utils';

export const handleRestoreRequest: IHandleRequest<APIName.VOUCHER_RESTORE_V2, number> = async ({
  query,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const { userId, companyId } = session;
  const { voucherId } = query;

  try {
    const now = getTimestampNow();
    const restoredVoucher = await restoreUtils.restoreVoucherAndRelations({
      voucherId,
      companyId,
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<number | null>>
) {
  if (req.method !== 'POST') {
    const { httpCode, result } = formatApiResponse<null>(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null);
    return res.status(httpCode).json(result);
  }

  const response = await withRequestValidation(
    APIName.VOUCHER_RESTORE_V2,
    req,
    handleRestoreRequest
  );
  const { httpCode, result } = formatApiResponse<number | null>(
    response.statusMessage,
    response.payload as number | null
  );
  return res.status(httpCode).json(result);
}

import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { validateRequest } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  /**
   * Info: (20240927 - Murky)
   * When user "enter" List voucher, List upcoming event or List payment and List receivable
   * all vouchers on the list should be read,
   * the "read" status than will be add to user_voucher database
   * the read status need to be unread if voucher change from upcoming event to uploaded
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: string | null = null;
  const session = await getSession(req, res);
  const { userId } = session;
  const { body } = validateRequest(APIName.VOUCHER_WAS_READ_V2, req, userId);

  if (body) {
    statusMessage = STATUS_MESSAGE.CREATED;
    payload = 'success';
  }

  return {
    statusMessage,
    payload,
    userId,
  };
}

type APIResponse = object | string | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
    userId: number;
  }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  let userId: number = -1;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload, userId } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    const logger = loggerError(userId, error.name, error.message);
    logger.error(error);
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}

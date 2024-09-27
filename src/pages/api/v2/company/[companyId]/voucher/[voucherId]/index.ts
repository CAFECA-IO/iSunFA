import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { getSession } from '@/lib/utils/session';
import { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';
import { mockVouchersReturn } from '@/pages/api/v2/company/[companyId]/voucher/route_utils';

export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: object | null = null;
  const session = await getSession(req, res);
  const { userId } = session;
  const { query } = validateRequest(APIName.VOUCHER_GET_BY_ID_V2, req, userId);

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query) {
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    [payload] = mockVouchersReturn;
  }
  return {
    statusMessage,
    payload,
    userId,
  };
}

export async function handlePutRequest(req: NextApiRequest, res: NextApiResponse) {
  /**
   * Info: (20240927 - Murky)
   * Put is not actually put, but add an reverse voucher and link to current voucher
   * maybe non lineItem put can just put original voucher?? => flow chart is needed
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const session = await getSession(req, res);
  const { userId } = session;
  const { query, body } = validateRequest(APIName.VOUCHER_POST_V2, req, userId);
  const mockPutVoucherId = 1002;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query && body) {
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = mockPutVoucherId;
  }

  return {
    statusMessage,
    payload,
    userId,
  };
}

export async function handleDeleteRequest(req: NextApiRequest, res: NextApiResponse) {
  /**
   * Info: (20240927 - Murky)
   * Delete is not actually put, but add an reverse voucher and link to current voucher
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const session = await getSession(req, res);
  const { userId } = session;
  const { query } = validateRequest(APIName.VOUCHER_DELETE_V2, req, userId);
  const mockDeleteVoucherId = 1002;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query) {
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = mockDeleteVoucherId;
  }

  return {
    statusMessage,
    payload,
    userId,
  };
}

type APIResponse = object | number | null;

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
  GET: handleGetRequest,
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
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

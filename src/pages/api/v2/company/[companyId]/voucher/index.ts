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
  const { query } = validateRequest(APIName.VOUCHER_LIST_V2, req, userId);

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query) {
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = {
      page: 1, // current page
      totalUnRead: 99,
      totalPages: 3,
      totalCount: 30,
      pageSize: 10,
      hasNextPage: true,
      hasPreviousPage: true,
      sort: [
        {
          sortBy: 'createAt',
          sortOrder: 'desc',
        },
      ],
      data: mockVouchersReturn,
    };
  }
  return {
    statusMessage,
    payload,
    userId,
  };
}
export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  /**
   * Info: (20240927 - Murky)
   * Post voucher has conditional situation when posting,
   * it might have recurring event, asset connecting, reverse voucher connect
   * if not that situation, front end can provide  undefined recurring event, or empty array for asset connecting, reverse voucher connect
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const session = await getSession(req, res);
  const { userId } = session;
  const { body } = validateRequest(APIName.VOUCHER_POST_V2, req, userId);
  const mockPostedVoucherId = 1002;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (body) {
    statusMessage = STATUS_MESSAGE.CREATED;
    payload = mockPostedVoucherId;
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

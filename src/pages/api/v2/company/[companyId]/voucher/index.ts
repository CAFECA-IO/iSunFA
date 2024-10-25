import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { mockVouchersReturn } from '@/pages/api/v2/company/[companyId]/voucher/route_utils';
import { withRequestValidation } from '@/lib/utils/middleware';

import { IHandleRequest } from '@/interfaces/handleRequest';

export const handleGetRequest: IHandleRequest<APIName.VOUCHER_LIST_V2, object> = async ({
  query,
}) => {
  // ToDo: (20240927 - Murky) Remember to add auth check
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: object | null = null;
  if (query) {
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = {
      page: 1, // Info: (20240927 - Murky) current page
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
  };
};

export const handlePostRequest: IHandleRequest<APIName.VOUCHER_POST_V2, number> = async ({
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const mockPostedVoucherId = 1002;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (body) {
    statusMessage = STATUS_MESSAGE.CREATED;
    payload = mockPostedVoucherId;
  }

  return {
    statusMessage,
    payload,
  };
};

type APIResponse = object | number | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.VOUCHER_LIST_V2, req, res, handleGetRequest),
  POST: (req, res) => withRequestValidation(APIName.VOUCHER_POST_V2, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  const userId: number = -1;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
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

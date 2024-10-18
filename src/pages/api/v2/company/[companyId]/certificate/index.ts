import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { mockCertificateList } from '@/pages/api/v2/company/[companyId]/certificate/route_utils';
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';

import { loggerError } from '@/lib/utils/logger_back';

type APIResponse =
  | object
  | {
      data: unknown;
    }
  | null;

export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload:
    | object
    | {
        data: unknown;
      }
    | null = null;

  const session = await getSession(req, res);
  const { userId } = session;

  // ToDo: (20240924 - Murky) We need to check auth
  //   const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  //   if (isAuth) {
  const { query } = validateRequest(APIName.CERTIFICATE_LIST_V2, req, userId);

  if (query) {
    // ToDo: (20240924 - Murky) Remember to use sortBy, sortOrder, startDate, endDate, searchQuery, hasBeenUsed
    const { page, pageSize, sortBy, sortOrder } = query;
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = {
      data: mockCertificateList,
      page,
      totalPages: 3,
      totalCount: 30,
      pageSize,
      hasNextPage: true,
      hasPreviousPage: false,
      sort: [
        {
          sortBy,
          sortOrder,
        },
      ],
    };
  }
  //   }

  return {
    statusMessage,
    payload,
    userId,
  };
}

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: object | null = null;

  const session = await getSession(req, res);
  const { userId } = session;

  const { body } = validateRequest(APIName.CERTIFICATE_POST_V2, req, userId);

  if (body) {
    statusMessage = STATUS_MESSAGE.CREATED;
    [payload] = mockCertificateList;
  }

  return {
    statusMessage,
    payload,
    userId,
  };
}
const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: APIResponse; userId: number }>;
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
  let userId = -1;
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

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IUserActionLog } from '@/interfaces/user_action_log';
import { IPaginatedData } from '@/interfaces/pagination';

// ToDo: (20240924 - Jacky) Implement the logic to get the user action logs data from the database
async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IUserActionLog[]> | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Implement the logic to get the user action logs data from the database
  // ToDo: (20240924 - Jacky) Format the user action logs data to the IUserActionLog interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  payload = {
    data: [
      {
        id: 1,
        sessionId: 'abc123',
        userId: 1,
        actionType: 'LOGIN',
        actionDescription: 'User logged in',
        actionTime: Date.now(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        apiEndpoint: '/api/login',
        httpMethod: 'POST',
        requestPayload: { username: 'user1' },
        httpStatusCode: 200,
        statusMessage: 'Success',
      },
    ],
    page: 1,
    totalPages: 5,
    totalCount: 23,
    pageSize: 5,
    hasNextPage: true,
    hasPreviousPage: false,
    sort: [
      {
        sortBy: 'actionTime',
        sortOrder: 'desc',
      },
    ],
  };
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPaginatedData<IUserActionLog[]> | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedData<IUserActionLog[]> | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IUserActionLog[]> | null = null;

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
    const { httpCode, result } = formatApiResponse<IPaginatedData<IUserActionLog[]> | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IUserActionLog } from '@/interfaces/user_action_log';
import { IPaginatedData } from '@/interfaces/pagination';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { listUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { UserActionLog } from '@prisma/client';

// ToDo: (20240924 - Jacky) Implement the logic to get the user action logs data from the database
const handleGetRequest: IHandleRequest<
  APIName.USER_ACTION_LOG_LIST,
  IPaginatedData<UserActionLog[]>
> = async ({ query, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<UserActionLog[]> | null = null;

  const { userId, actionType, page, pageSize, startDateInSecond, endDateInSecond } = query;
  const listedUserActionLog = await listUserActionLog(
    userId,
    actionType,
    page,
    pageSize,
    startDateInSecond,
    endDateInSecond
  );
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  const data = listedUserActionLog.data.map((log) => ({
    ...log,
    isCurrent: session.sid === log.sessionId,
  }));
  listedUserActionLog.data = data;
  payload = listedUserActionLog;
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPaginatedData<IUserActionLog[]> | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.USER_ACTION_LOG_LIST, req, handleGetRequest),
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

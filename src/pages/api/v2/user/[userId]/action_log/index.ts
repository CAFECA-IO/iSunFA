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
import { UserActionLogActionType } from '@/constants/user_action_log';
import { paginatedUserActionLogSchema } from '@/lib/utils/zod_schema/user_action_log';

// ToDo: (20240924 - Jacky) Implement the logic to get the user action logs data from the database
const handleGetRequest: IHandleRequest<
  APIName.USER_ACTION_LOG_LIST,
  IPaginatedData<IUserActionLog[]>
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IUserActionLog[]> | null = null;

  const { userId } = query;
  const listedUserActionLog = await listUserActionLog(userId, UserActionLogActionType.LOGIN);
  const userActionLogList = paginatedUserActionLogSchema.safeParse(listedUserActionLog);

  if (userActionLogList.success) {
    payload = userActionLogList.data;
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPaginatedData<IUserActionLog[]> | null }>;
} = {
  GET: (req, res) =>
    withRequestValidation(APIName.USER_ACTION_LOG_LIST, req, res, handleGetRequest),
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

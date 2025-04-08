import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IPaginatedData } from '@/interfaces/pagination';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { createTodo, listTodoMapped } from '@/lib/utils/repo/todo.repo';
import { ITodoAccountBook } from '@/interfaces/todo';
import { todoListPostApiUtils as postUtils } from '@/pages/api/v2/user/[userId]/todo/route_utils';
import loggerBack from '@/lib/utils/logger_back';

const handleGetRequest: IHandleRequest<APIName.TODO_LIST, ITodoAccountBook[]> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook[] = [];

  const { userId } = query;
  const todoList = await listTodoMapped(userId);

  loggerBack.info(`todoList: ${JSON.stringify(todoList)}`);

  payload = todoList;
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
};

const handlePostRequest: IHandleRequest<APIName.CREATE_TODO, ITodoAccountBook> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  const { userId } = query;
  const { note, startDate, endDate } = body;

  const noteWithTime = postUtils.combineStartEndTimeInNote({
    note,
    startDate,
    endDate,
  });

  const createdTodo = await createTodo({ ...body, note: noteWithTime, userId });

  statusMessage = STATUS_MESSAGE.CREATED;

  return { statusMessage, payload: createdTodo };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: ITodoAccountBook | ITodoAccountBook[] | null;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.TODO_LIST, req, handleGetRequest),
  POST: (req) => withRequestValidation(APIName.CREATE_TODO, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<IPaginatedData<ITodoAccountBook[]> | ITodoAccountBook | ITodoAccountBook[] | null>
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook | ITodoAccountBook[] | null = null;

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
    const { httpCode, result } = formatApiResponse<
      IPaginatedData<ITodoAccountBook[]> | ITodoAccountBook | ITodoAccountBook[] | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

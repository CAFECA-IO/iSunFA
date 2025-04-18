import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { todoListPostApiUtils as postUtils } from '@/pages/api/v2/user/[userId]/todo/route_utils';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { createTodo, listTodoMapped } from '@/lib/utils/repo/todo.repo';
import { validateOutputData } from '@/lib/utils/validator';
import { ITodoAccountBook } from '@/interfaces/todo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook[] | null = null;
  await checkSessionUser(session, APIName.TODO_LIST, req);
  await checkUserAuthorization(APIName.TODO_LIST, req, session);

  const { query } = checkRequestData(APIName.TODO_LIST, req, session);

  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const todoList = await listTodoMapped(userId);

  const { isOutputDataValid, outputData } = validateOutputData(APIName.TODO_LIST, todoList);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook | null = null;
  await checkSessionUser(session, APIName.CREATE_TODO, req);
  await checkUserAuthorization(APIName.CREATE_TODO, req, session);

  const { query, body } = checkRequestData(APIName.CREATE_TODO, req, session);

  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;

  const { userId } = query;
  const { note, startDate, endDate } = body;

  const noteWithTime = postUtils.combineStartEndTimeInNote({
    note,
    startDate,
    endDate,
  });

  const createdTodo = await createTodo({ ...body, note: noteWithTime, userId });

  const { isOutputDataValid, outputData } = validateOutputData(APIName.CREATE_TODO, createdTodo);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.TODO_LIST;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.TODO_LIST;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.POST:
        apiName = APIName.CREATE_TODO;
        ({ response, statusMessage } = await handlePostRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}

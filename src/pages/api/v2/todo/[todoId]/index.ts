import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { deleteTodo, getTodoById, updateTodo } from '@/lib/utils/repo/todo.repo';
import { APIName } from '@/constants/api_connection';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { ITodoAccountBook } from '@/interfaces/todo';
import { todoListPostApiUtils as postUtils } from '@/pages/api/v2/user/[userId]/todo/route_utils';
import { HTTP_STATUS } from '@/constants/http';
import { getSession } from '@/lib/utils/session';
import { validateOutputData } from '@/lib/utils/validator';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook | null = null;
  await checkSessionUser(session, APIName.TODO_GET_BY_ID, req);
  await checkUserAuthorization(APIName.TODO_GET_BY_ID, req, session);

  const { query } = checkRequestData(APIName.TODO_GET_BY_ID, req, session);

  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const { todoId } = query;
  const todo = await getTodoById(todoId);

  const { isOutputDataValid, outputData } = validateOutputData(APIName.TODO_GET_BY_ID, todo);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePutRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook | null = null;
  await checkSessionUser(session, APIName.UPDATE_TODO, req);
  await checkUserAuthorization(APIName.UPDATE_TODO, req, session);

  const { query, body } = checkRequestData(APIName.UPDATE_TODO, req, session);

  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const { todoId } = query;
  const constructedNote = postUtils.combineStartEndTimeInNote(body);
  const updatedTodo = await updateTodo({ ...body, id: todoId, note: constructedNote });

  const { isOutputDataValid, outputData } = validateOutputData(APIName.UPDATE_TODO, updatedTodo);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handleDeleteRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook | null = null;
  await checkSessionUser(session, APIName.DELETE_TODO, req);
  await checkUserAuthorization(APIName.DELETE_TODO, req, session);

  const { query } = checkRequestData(APIName.DELETE_TODO, req, session);

  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const { todoId } = query;
  const deletedTodo = await deleteTodo(Number(todoId));

  const { isOutputDataValid, outputData } = validateOutputData(APIName.DELETE_TODO, deletedTodo);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.TODO_GET_BY_ID;
  const session = await getSession(req);

  try {
    switch (method) {
      case 'GET':
        apiName = APIName.TODO_GET_BY_ID;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case 'PUT':
        apiName = APIName.UPDATE_TODO;
        ({ response, statusMessage } = await handlePutRequest(req));
        ({ httpCode, result } = response);
        break;
      case 'DELETE':
        apiName = APIName.DELETE_TODO;
        ({ response, statusMessage } = await handleDeleteRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE];
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}

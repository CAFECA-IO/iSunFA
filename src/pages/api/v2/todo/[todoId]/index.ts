import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { deleteTodo, getTodoById, updateTodo } from '@/lib/utils/repo/todo.repo';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { ITodoAccountBook } from '@/interfaces/todo';
import {
  todoListGetListApiUtils as getListUtils,
  todoListPostApiUtils as postUtils,
} from '@/pages/api/v2/user/[userId]/todo/route_utils';

const handleGetRequest: IHandleRequest<APIName.TODO_GET_BY_ID, ITodoAccountBook> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook | null = null;

  const { todoId } = query;
  const todoFromPrisma = await getTodoById(todoId);
  if (todoFromPrisma) {
    const { startDate, endDate, note } = getListUtils.splitStartEndTimeInNote(todoFromPrisma.note);
    const todo = {
      ...todoFromPrisma,
      startDate,
      endDate,
      note,
    };
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = todo;
  }
  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<APIName.UPDATE_TODO, ITodoAccountBook> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook | null = null;

  const { todoId } = query;
  const constructedNote = postUtils.combineStartEndTimeInNote(body);
  const updatedTodo = await updateTodo({ ...body, id: todoId, note: constructedNote });
  if (updatedTodo) {
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = updatedTodo;
  }
  return { statusMessage, payload };
};

const handleDeleteRequest: IHandleRequest<APIName.DELETE_TODO, ITodoAccountBook> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook | null = null;

  const { todoId } = query;
  const deletedTodoFromPrisma = await deleteTodo(Number(todoId));
  if (deletedTodoFromPrisma) {
    const { startDate, endDate, note } = getListUtils.splitStartEndTimeInNote(
      deletedTodoFromPrisma.note
    );
    const deletedTodo = {
      ...deletedTodoFromPrisma,
      startDate,
      endDate,
      note,
    };
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = deletedTodo;
  }
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ITodoAccountBook | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.TODO_GET_BY_ID, req, handleGetRequest),
  PUT: (req) => withRequestValidation(APIName.UPDATE_TODO, req, handlePutRequest),
  DELETE: (req) => withRequestValidation(APIName.DELETE_TODO, req, handleDeleteRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ITodoAccountBook | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoAccountBook | null = null;

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
    const { httpCode, result } = formatApiResponse<ITodoAccountBook | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IPaginatedData } from '@/interfaces/pagination';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { Company, File, Todo } from '@prisma/client';
import { createTodo, listTodo } from '@/lib/utils/repo/todo.repo';
import { ITodoCompany } from '@/interfaces/todo';
import {
  todoListPostApiUtils as postUtils,
  todoListGetListApiUtils as getUtils,
} from '@/pages/api/v2/user/[userId]/todo/route_utils';

const handleGetRequest: IHandleRequest<
  APIName.TODO_LIST,
  (Todo & { userTodoCompanies: { company: Company & { imageFile: File } }[] })[]
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: (Todo & { userTodoCompanies: { company: Company & { imageFile: File } }[] })[] = [];

  const { userId } = query;
  const todoListFromPrisma = await listTodo(userId);

  const todoList = todoListFromPrisma
    .map((todo) => {
      const { startTime, endTime, note } = getUtils.splitStartEndTimeInNote(todo.note);
      return {
        ...todo,
        startTime,
        endTime,
        note,
      };
    })
    .sort((a, b) => {
      return a.endTime - b.endTime;
    });

  payload = todoList;
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
};

const handlePostRequest: IHandleRequest<
  APIName.CREATE_TODO,
  Todo & {
    userTodoCompanies: { company: Company & { imageFile: File } }[];
    startTime: number;
    endTime: number;
  }
> = async ({ query, body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload:
    | (Todo & {
        userTodoCompanies: { company: Company & { imageFile: File } }[];
        startTime: number;
        endTime: number;
      })
    | null = null;

  const { userId } = query;
  const { companyId, name, note, deadline, startTime, endTime } = body;

  const noteWithTime = postUtils.combineStartEndTimeInNote({
    note,
    startTime,
    endTime,
  });

  const createdTodo = await createTodo(userId, name, deadline, noteWithTime, companyId);

  payload = {
    ...createdTodo,
    startTime,
    endTime,
  };
  statusMessage = STATUS_MESSAGE.CREATED;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: ITodoCompany | ITodoCompany[] | null;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.TODO_LIST, req, handleGetRequest),
  POST: (req) => withRequestValidation(APIName.CREATE_TODO, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<IPaginatedData<ITodoCompany[]> | ITodoCompany | ITodoCompany[] | null>
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoCompany | ITodoCompany[] | null = null;

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
      IPaginatedData<ITodoCompany[]> | ITodoCompany | ITodoCompany[] | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

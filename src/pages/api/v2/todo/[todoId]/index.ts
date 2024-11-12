import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { deleteTodo, getTodoById, updateTodo } from '@/lib/utils/repo/todo.repo';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { Company, Todo, File } from '@prisma/client';
import { ITodoCompany } from '@/interfaces/todo';

const handleGetRequest: IHandleRequest<
  APIName.TODO_GET_BY_ID,
  Todo & { userTodoCompanies: { company: Company & { imageFile: File } }[] }
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: (Todo & { userTodoCompanies: { company: Company & { imageFile: File } }[] }) | null =
    null;

  const { todoId } = query;
  const todo = await getTodoById(todoId);
  if (todo) {
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = todo;
  }
  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<
  APIName.TODO_UPDATE,
  Todo & { userTodoCompanies: { company: Company & { imageFile: File } }[] }
> = async ({ query, body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: (Todo & { userTodoCompanies: { company: Company & { imageFile: File } }[] }) | null =
    null;

  const { todoId } = query;
  const { name, deadline, note, companyId } = body;
  const updatedTodo = await updateTodo(todoId, companyId, name, deadline, note);
  if (updatedTodo) {
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = updatedTodo;
  }
  return { statusMessage, payload };
};

const handleDeleteRequest: IHandleRequest<
  APIName.TODO_DELETE,
  Todo & { userTodoCompanies: { company: Company & { imageFile: File } }[] }
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: (Todo & { userTodoCompanies: { company: Company & { imageFile: File } }[] }) | null =
    null;

  const { todoId } = query;
  const deletedTodo = await deleteTodo(Number(todoId));
  if (deletedTodo) {
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = deletedTodo;
  }
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ITodoCompany | null }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.TODO_GET_BY_ID, req, res, handleGetRequest),
  PUT: (req, res) => withRequestValidation(APIName.TODO_UPDATE, req, res, handlePutRequest),
  DELETE: (req, res) => withRequestValidation(APIName.TODO_DELETE, req, res, handleDeleteRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ITodoCompany | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodoCompany | null = null;

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
    const { httpCode, result } = formatApiResponse<ITodoCompany | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

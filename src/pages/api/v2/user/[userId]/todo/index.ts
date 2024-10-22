import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ITodo } from '@/interfaces/todo';
import { IPaginatedData } from '@/interfaces/pagination';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';

const handleGetRequest: IHandleRequest<APIName.TODO_LIST, ITodo[]> = async () => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodo[] | null = null;

  const todoList: ITodo[] = [
    {
      id: 1,
      title: 'Test',
      content: 'Test',
      type: 'Test',
      time: 1000000000,
      status: 'Test',
      createdAt: 1000000000,
      updatedAt: 1000000000,
    },
  ];

  payload = todoList;
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
};

const handlePostRequest: IHandleRequest<APIName.CREATE_TODO, ITodo> = async ({ body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodo | null = null;

  const { title, content, type, time, status } = body;
  const createdTodo = {
    id: 1,
    title,
    content,
    type,
    time,
    status,
    createdAt: 1000000000,
    updatedAt: 1000000000,
  };

  payload = createdTodo;
  statusMessage = STATUS_MESSAGE.CREATED;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: ITodo | ITodo[] | null;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.TODO_LIST, req, res, handleGetRequest),
  POST: (req, res) => withRequestValidation(APIName.CREATE_TODO, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedData<ITodo[]> | ITodo | ITodo[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITodo | ITodo[] | null = null;

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
      IPaginatedData<ITodo[]> | ITodo | ITodo[] | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

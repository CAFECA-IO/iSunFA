import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { INews } from '@/interfaces/news';
import { IPaginatedData } from '@/interfaces/pagination';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { createNews, listNews, listNewsSimple } from '@/lib/utils/repo/news.repo';

const handleGetRequest: IHandleRequest<
  APIName.NEWS_LIST,
  INews[] | IPaginatedData<INews[]>
> = async ({ query }) => {
  // ToDo: (20241024 - Murky) API接口請符合 FilterSection 公版
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: INews[] | IPaginatedData<INews[]> | null = null;

  let newsList: INews[] | IPaginatedData<INews[]> | null;
  const { simple, type, targetPage, pageSize, startDateInSecond, endDateInSecond, searchQuery } =
    query;
  if (simple) {
    newsList = await listNewsSimple(type, pageSize);
  } else {
    newsList = await listNews(
      type,
      targetPage,
      pageSize,
      startDateInSecond,
      endDateInSecond,
      searchQuery
    );
  }

  payload = newsList;
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
};

const handlePostRequest: IHandleRequest<APIName.CREATE_NEWS, INews> = async ({ body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: INews | null = null;

  const { title, content, type } = body;
  const createdNews = await createNews(title, content, type);

  payload = createdNews;
  statusMessage = STATUS_MESSAGE.CREATED;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: IPaginatedData<INews[]> | INews | INews[] | null;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.NEWS_LIST, req, res, handleGetRequest),
  POST: (req, res) => withRequestValidation(APIName.CREATE_NEWS, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedData<INews[]> | INews | INews[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<INews[]> | INews | INews[] | null = null;

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
      IPaginatedData<INews[]> | INews | INews[] | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

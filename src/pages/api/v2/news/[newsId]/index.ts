import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { INews } from '@/interfaces/news';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { getNewsById } from '@/lib/utils/repo/news.repo';

const handleGetRequest: IHandleRequest<APIName.NEWS_GET_BY_ID, INews> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: INews | null = null;

  const { newsId } = query;
  const news = await getNewsById(newsId);
  payload = news;
  statusMessage = STATUS_MESSAGE.SUCCESS;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: INews | null;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.NEWS_GET_BY_ID, req, res, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<INews | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: INews | null = null;

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
    const { httpCode, result } = formatApiResponse<INews | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

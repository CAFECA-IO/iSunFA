import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { INews } from '@/interfaces/news';

// ToDo: (20240924 - Jacky) Implement the logic to get the news data from the database
async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: INews[] | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Implement the logic to get the news data from the database
  // ToDo: (20240924 - Jacky) Format the news data to the INews interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  payload = [
    {
      id: 1,
      title: 'Breaking News',
      content: 'This is the content of the breaking news.',
      type: 'Breaking',
      createdAt: 11111,
      updatedAt: 11111,
    },
    {
      id: 2,
      title: 'Tech News',
      content: 'This is the content of the tech news.',
      type: 'Technology',
      createdAt: 11111,
      updatedAt: 111111,
    },
  ];
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
}

// ToDo: (20240924 - Jacky) Implement the logic to create a new news item in the database
async function handlePostRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: INews | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Validate the request body
  // ToDo: (20240924 - Jacky) Implement the logic to create a new news item in the database
  // ToDo: (20240924 - Jacky) Format the news data to the INews interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  const newNews: INews = {
    id: 3,
    title: 'req.body.title',
    content: 'req.body.content',
    type: 'req.body.type',
    createdAt: 82717,
    updatedAt: 75275,
  };

  payload = newNews;
  statusMessage = STATUS_MESSAGE.CREATED;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: INews[] | INews | null }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<INews[] | INews | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: INews[] | INews | null = null;

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
    const { httpCode, result } = formatApiResponse<INews[] | INews | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

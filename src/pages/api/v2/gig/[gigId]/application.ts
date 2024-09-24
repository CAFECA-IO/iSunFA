import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const applicationSchema = z.object({
  id: z.number(),
  bookkeeperId: z.number(),
  gigId: z.number(),
  content: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

type IApplication = z.infer<typeof applicationSchema>;

const applicationsOutput: IApplication[] = [
  {
    id: 1,
    bookkeeperId: 1000,
    gigId: 1,
    content: '我有3年以上的記帳經驗，熟悉國際會計準則。',
    createdAt: 1692489600,
    updatedAt: 1692489600,
  },
  {
    id: 2,
    bookkeeperId: 1001,
    gigId: 2,
    content: '我是有執照的會計師，有豐富的稅務申報經驗。',
    createdAt: 1692499600,
    updatedAt: 1692499600,
  },
];

export async function handlePostRequest(
  req: NextApiRequest,
  // ToDo: implement the logic to get the application data from the database (20240924 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  res: NextApiResponse<IResponseData<IApplication | null>>
) {
  const { gigId } = req.query;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IApplication | null = null;

  const result = applicationSchema.partial().safeParse(req.body);
  if (result.success && result.data.content) {
    const newApplication: IApplication = {
      id: applicationsOutput.length + 1,
      bookkeeperId: 1000,
      gigId: parseInt(gigId as string, 10),
      content: result.data.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    applicationsOutput.push(newApplication);
    statusMessage = STATUS_MESSAGE.CREATED;
    payload = newApplication;
  } else {
    statusMessage = STATUS_MESSAGE.BAD_REQUEST;
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IApplication | null }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IApplication | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IApplication | null = null;

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
    const { httpCode, result } = formatApiResponse<IApplication | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

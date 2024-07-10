import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { createChallenge } from '@/lib/utils/authorization';
import { getSession, setSession } from '@/lib/utils/session';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<string | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: string | null = null;

  const session = await getSession(req, res);
  const challenge = await createChallenge();
  await setSession(session, undefined, undefined, challenge);
  if (challenge) {
    statusMessage = STATUS_MESSAGE.SUCCESS;
    payload = challenge;
  }
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<string | null>>
  ) => Promise<{ statusMessage: string; payload: string | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<string | null>>
): Promise<void> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: string | null = null;

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
    const { httpCode, result } = formatApiResponse<string | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

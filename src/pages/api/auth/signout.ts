import type { NextApiRequest, NextApiResponse } from 'next';
import { loggerError } from '@/lib/utils/logger_back';
import { handleSignOutSession } from '@/lib/utils/signout';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ statusMessage: string; payload: null }> {
  await handleSignOutSession(req, res);
  return { statusMessage: STATUS_MESSAGE.SUCCESS, payload: null };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: null }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (error) {
    // Info: (20241127 - tzuhan) 錯誤處理
    loggerError(-1, 'sign-out failed', error as Error);
    const userFriendlyMessage = 'Failed to sign out';
    statusMessage = (error as Error).message || userFriendlyMessage;
  } finally {
    const { httpCode, result } = formatApiResponse<null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

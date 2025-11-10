import type { NextApiRequest, NextApiResponse } from 'next';
import { handleSignOutSession } from '@/lib/utils/signout';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

async function handlePostRequest(
  req: NextApiRequest
): Promise<{ statusMessage: string; payload: null }> {
  await handleSignOutSession(req);
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
    (error as Error).message += ' | Failed to sign out.';
    /* Info: (20250108 - Luphia) 登出失敗不需要紀錄
    const userFriendlyMessage = 'Failed to sign out';
    statusMessage = (error as Error).message || userFriendlyMessage;
    const errorInfo = {
      userId: DefaultValue.USER_ID.GUEST,
      errorType: 'sign-out failed',
      errorMessage: statusMessage,
    };
    loggerError(errorInfo);
     */
  } finally {
    const { httpCode, result } = formatApiResponse<null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

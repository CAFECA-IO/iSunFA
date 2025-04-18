import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { getSession, setSession } from '@/lib/utils/session';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';

interface IResponse {
  statusMessage: string;
  payload: { success: boolean } | null;
}

const handleGetRequest: IHandleRequest<
  APIName.DISCONNECT_ACCOUNT_BOOK,
  { success: boolean } | null
> = async ({ session, req }) => {
  const userId = session?.userId;
  const currentCompanyId = session?.companyId;

  if (!currentCompanyId) {
    loggerBack.info(`用戶 ${userId} 嘗試斷開連接，但目前未連接任何帳本`);
    return { statusMessage: STATUS_MESSAGE.SUCCESS, payload: { success: true } };
  }

  try {
    // 從 session 中移除 companyId
    await setSession(session, { companyId: undefined });

    loggerBack.info(`用戶 ${userId} 已成功斷開與帳本 ${currentCompanyId} 的連接`);

    // getSession and loggerBack to see if the disconnect is successful
    const newSession = await getSession(req);
    loggerBack.info(
      `AfterDisconnect, 用戶 ${userId} 的 session data: ${JSON.stringify(newSession)} 的連接`
    );

    return { statusMessage: STATUS_MESSAGE.SUCCESS, payload: { success: true } };
  } catch (error) {
    loggerBack.error(`用戶 ${userId} 斷開與帳本 ${currentCompanyId} 的連接時發生錯誤`, error);
    return { statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, payload: null };
  }
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: (req) => withRequestValidation(APIName.DISCONNECT_ACCOUNT_BOOK, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IResponse['payload']>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IResponse['payload'] = null;
  const session = await getSession(req);

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
    loggerError({
      userId: session?.userId,
      errorType: 'disconnectAccountBook',
      errorMessage: error,
    });
  } finally {
    const { httpCode, result } = formatApiResponse<IResponse['payload']>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

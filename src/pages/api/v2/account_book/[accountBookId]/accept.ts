import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { ITransferAccountBook } from '@/interfaces/team';
import { acceptTransferAccountBook } from '@/lib/utils/repo/account_book.repo';
import { validateOutputData } from '@/lib/utils/validator';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITransferAccountBook | null = null;

  // Info: (20250314 - Tzuhan) 檢查使用者登入
  await checkSessionUser(session, APIName.ACCEPT_TRANSFER_ACCOUNT_BOOK, req);
  await checkUserAuthorization(APIName.ACCEPT_TRANSFER_ACCOUNT_BOOK, req, session);

  // Info: (20250314 - Tzuhan) 檢查請求參數
  const { query } = checkRequestData(APIName.ACCEPT_TRANSFER_ACCOUNT_BOOK, req, session);

  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  loggerBack.info(`User ${userId} accepts the transfer of accountBook ${query.accountBookId}`);
  const transferResult = await acceptTransferAccountBook(userId, query.accountBookId);
  statusMessage = STATUS_MESSAGE.SUCCESS;
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.ACCEPT_TRANSFER_ACCOUNT_BOOK,
    transferResult
  );
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);
  try {
    switch (method) {
      case 'GET':
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE];
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, APIName.ACCEPT_TRANSFER_ACCOUNT_BOOK, req, statusMessage);

  res.status(httpCode).json(result);
}

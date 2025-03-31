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
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { createAccountBook, listAccountBookByUserId } from '@/lib/utils/repo/account_book.repo';
import { IAccountBook, IAccountBookWithTeam } from '@/interfaces/account_book';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IAccountBookWithTeam[]> | null = null;
  await checkSessionUser(session, APIName.LIST_ACCOUNT_BOOK_BY_USER_ID, req);
  await checkUserAuthorization(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID, req, session);

  const { query } = checkRequestData(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID, req, session);
  loggerBack.info(`List accountBook by userId: ${userId} with query: ${JSON.stringify(query)}`);

  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const options: IPaginatedOptions<IAccountBookWithTeam[]> = await listAccountBookByUserId(
    userId,
    query
  );
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_ACCOUNT_BOOK_BY_USER_ID,
    toPaginatedData(options)
  );
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;
  await checkSessionUser(session, APIName.CREATE_ACCOUNT_BOOK, req);
  await checkUserAuthorization(APIName.CREATE_ACCOUNT_BOOK, req, session);

  const { query, body } = checkRequestData(APIName.CREATE_ACCOUNT_BOOK, req, session);
  loggerBack.info(
    `Create accountBook by userId: ${userId} with query: ${JSON.stringify(query)} & body: ${JSON.stringify(body)}`
  );

  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  if (query.userId !== userId) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const accountBook = await createAccountBook(userId, body);

  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.CREATE_ACCOUNT_BOOK,
    accountBook
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
  let apiName: APIName = APIName.LIST_ACCOUNT_BOOK_BY_USER_ID;
  const session = await getSession(req);

  try {
    switch (method) {
      case 'GET':
        apiName = APIName.LIST_ACCOUNT_BOOK_BY_USER_ID;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case 'POST':
        apiName = APIName.CREATE_ACCOUNT_BOOK;
        ({ response, statusMessage } = await handlePostRequest(req));
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
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}

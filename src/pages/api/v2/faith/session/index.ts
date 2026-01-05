import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { checkRequestData, checkUserAuthorization, logUserAction } from '@/lib/utils/middleware';
import { formatApiResponse } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { ICreateSessionOptions, IFaithSession } from '@/interfaces/faith';
import { listSessionsByUserId, createSession } from '@/lib/utils/repo/faith/session.repo';

const apiNameGET = APIName.LIST_FAITH_SESSION;
const apiNamePOST = APIName.CREATE_FAITH_SESSION;

export const dummyFaithSessions: IFaithSession[] = [
  {
    id: '10000001',
    title: '費思：最受信任的人工智能會計師',
    description:
      '費思（FAITH）是一個基於區塊鏈技術的人工智能會計師，旨在為用戶提供安全、透明和高效的財務管理服務。',
    unreadCount: 5,
    createdAt: 1711372800,
    updatedAt: 1713951200,
  },
  {
    id: '10000002',
    title: '費思：智能財務管理的未來',
    description:
      '費思（FAITH）利用先進的人工智能技術，為用戶提供個性化的財務建議和解決方案，幫助他們更好地管理財務。',
    unreadCount: 0,
    createdAt: 1713951200,
    updatedAt: 1716529600,
  },
];

const handleGetRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);
  const { userId } = await getSession(req);

  await checkUserAuthorization(apiNameGET, req, session);

  const { query } = checkRequestData(apiNameGET, req, session);

  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // ToDo: (20251120 - Luphia) Business logic here.
  const result = await listSessionsByUserId(userId);

  const { isOutputDataValid, outputData } = validateOutputData(apiNameGET, result);

  statusMessage = isOutputDataValid ? STATUS_MESSAGE.SUCCESS : STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  payload = isOutputDataValid ? outputData : null;

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePostRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  const session = await getSession(req);

  await checkUserAuthorization(apiNamePOST, req, session);

  const { query, body } = checkRequestData(apiNamePOST, req, session);
  if (!body || !query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // ToDo: (20251120 - Luphia) Business logic here.
  const { userId } = await getSession(req);
  const { title, description } = body;
  const options: ICreateSessionOptions = {
    userId,
    title,
    description,
  };
  const result = await createSession(options);

  const { isOutputDataValid, outputData } = validateOutputData(apiNamePOST, result);

  statusMessage = isOutputDataValid ? STATUS_MESSAGE.SUCCESS : STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  payload = isOutputDataValid ? outputData : null;
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);
  const apiName = APIName.LIST_FAITH_SESSION;

  try {
    switch (method) {
      // Info: (20251130 - Luphia) 列出用戶所有聊天室
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      // Info: (20251130 - Luphia) 新增用戶聊天室
      case HttpMethod.POST:
        ({ response, statusMessage } = await handlePostRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    loggerBack.error(`error: ${JSON.stringify(error)}`);
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}

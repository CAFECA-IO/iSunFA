import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { checkRequestData, checkUserAuthorization, logUserAction } from '@/lib/utils/middleware';
import { formatApiResponse } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { dummyFaithSessions } from '@/pages/api/v2/faith/session';
import { deleteSession, updateSession } from '@/lib/utils/repo/faith/session.repo';

const apiNameGET = APIName.GET_FAITH_SESSION_BY_ID;
const apiNamePUT = APIName.PUT_FAITH_SESSION_BY_ID;
const apiNameDELETE = APIName.DELETE_FAITH_SESSION_BY_ID;

const handleGetRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);

  await checkUserAuthorization(apiNameGET, req, session);

  const { query } = checkRequestData(apiNameGET, req, session);

  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // ToDo: (20251120 - Luphia) Business logic here.
  const result = dummyFaithSessions[0];

  const { isOutputDataValid, outputData } = validateOutputData(apiNameGET, result);

  statusMessage = isOutputDataValid ? STATUS_MESSAGE.SUCCESS : STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  payload = isOutputDataValid ? outputData : null;

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePutRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);

  await checkUserAuthorization(apiNamePUT, req, session);

  const { query, body } = checkRequestData(apiNamePUT, req, session);

  if (!query || !body) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // ToDo: (20251120 - Luphia) Business logic here.
  const { userId } = session;
  const sessionId = query.session_id;
  const { title, description } = body;
  const options = {
    id: sessionId,
    userId,
    title,
    description,
  };
  const result = await updateSession(options);

  const { isOutputDataValid, outputData } = validateOutputData(apiNamePUT, result);

  statusMessage = isOutputDataValid ? STATUS_MESSAGE.SUCCESS : STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  payload = isOutputDataValid ? outputData : null;

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handleDeleteRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);

  await checkUserAuthorization(apiNameDELETE, req, session);
  const { query } = checkRequestData(apiNameDELETE, req, session);

  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // ToDo: (20251120 - Luphia) Business logic here.
  const sessionId = query.session_id;
  const result = await deleteSession(sessionId);

  const { isOutputDataValid, outputData } = validateOutputData(apiNameDELETE, result);

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

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        await logUserAction(session, APIName.GET_FAITH_SESSION_BY_ID, req, statusMessage);
        break;
      case HttpMethod.PUT:
        ({ response, statusMessage } = await handlePutRequest(req));
        ({ httpCode, result } = response);
        await logUserAction(session, APIName.PUT_FAITH_SESSION_BY_ID, req, statusMessage);
        break;
      case HttpMethod.DELETE:
        ({ response, statusMessage } = await handleDeleteRequest(req));
        ({ httpCode, result } = response);
        await logUserAction(session, APIName.DELETE_FAITH_SESSION_BY_ID, req, statusMessage);
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

  res.status(httpCode).json(result);
}

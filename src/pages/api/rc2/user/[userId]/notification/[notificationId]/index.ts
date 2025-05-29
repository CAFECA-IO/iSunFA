import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { formatApiResponse } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import { getNotificationById } from '@/lib/utils/repo/notification.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  const { query } = checkRequestData(APIName.GET_NOTIFICATION_BY_ID, req, session);
  await checkSessionUser(session, APIName.GET_NOTIFICATION_BY_ID, req);
  await checkUserAuthorization(APIName.GET_NOTIFICATION_BY_ID, req, session);

  if (!query || !query.userId || !query.notificationId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const notification = await getNotificationById(query.userId, query.notificationId);
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.GET_NOTIFICATION_BY_ID,
    notification
  );
  statusMessage = isOutputDataValid ? STATUS_MESSAGE.SUCCESS : STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  payload = isOutputDataValid ? outputData : null;

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
  let apiName = APIName.GET_NOTIFICATION_BY_ID;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.GET_NOTIFICATION_BY_ID;
        ({ response, statusMessage } = await handleGetRequest(req));
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

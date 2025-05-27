import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { formatApiResponse } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { acceptTeamInvitation } from '@/lib/utils/repo/team_member.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  const { query } = checkRequestData(APIName.ACCEPT_TEAM_INVITATION, req, session);
  await checkSessionUser(session, APIName.ACCEPT_TEAM_INVITATION, req);
  await checkUserAuthorization(APIName.ACCEPT_TEAM_INVITATION, req, session);

  if (!query || !query.teamId) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const notifications = await acceptTeamInvitation(session.userId, query.teamId);
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.ACCEPT_TEAM_INVITATION,
    notifications
  );
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

  await logUserAction(session, APIName.ACCEPT_TEAM_INVITATION, req, statusMessage);
  res.status(httpCode).json(result);
}

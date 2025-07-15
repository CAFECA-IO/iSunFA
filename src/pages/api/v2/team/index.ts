import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { ITeam, TeamRole } from '@/interfaces/team';
import { getSession, updateTeamMemberSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { createTeamWithTrial } from '@/lib/utils/repo/team.repo';

const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeam | null = null;
  await checkSessionUser(session, APIName.CREATE_TEAM, req);
  await checkUserAuthorization(APIName.CREATE_TEAM, req, session);

  const { body } = checkRequestData(APIName.CREATE_TEAM, req, session);
  if (body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  loggerBack.info(`Create Team by userId: ${userId} with body: ${JSON.stringify(body)}`);

  const createdTeam = await createTeamWithTrial(userId, body);

  // Info: (20250715 - Shirley) Update session to include new team membership
  await updateTeamMemberSession(userId, createdTeam.id, TeamRole.OWNER);

  statusMessage = STATUS_MESSAGE.CREATED;

  const { isOutputDataValid, outputData } = validateOutputData(APIName.CREATE_TEAM, createdTeam);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
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
    const err = error as Error;
    loggerBack.error(`Team creation error: ${err.message}`, err);
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, APIName.CREATE_TEAM, req, statusMessage);

  res.status(httpCode).json(result);
}

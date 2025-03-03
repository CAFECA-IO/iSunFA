import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IUpdateTeamBody, IUpdateTeamResponse } from '@/lib/utils/zod_schema/team';
import { ITeam } from '@/interfaces/team';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  withRequestValidation,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import { getTeamByTeamId } from '@/lib/utils/repo/team.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeam | null = null;
  const isLogin = await checkSessionUser(session, APIName.GET_TEAM_BY_ID, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const isAuth = await checkUserAuthorization(APIName.GET_TEAM_BY_ID, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const { query } = checkRequestData(APIName.GET_TEAM_BY_ID, req, session);
  if (query === null || query.teamId === undefined) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const teamId = Number(query.teamId);

  statusMessage = STATUS_MESSAGE.SUCCESS;

  loggerBack.info(
    `user ${userId} get Team by teamId: ${teamId} with query: ${JSON.stringify(query)}`
  );

  const team = await getTeamByTeamId(teamId, userId);
  const { isOutputDataValid, outputData } = validateOutputData(APIName.GET_TEAM_BY_ID, team);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const result = formatApiResponse(statusMessage, payload);
  return result;
};

/**
 * Info: (20250227 - Shirley) 處理 PUT 請求，更新團隊資訊，目前為 mock API
 */
const handlePutRequest: IHandleRequest<
  APIName.UPDATE_TEAM_BY_ID,
  IUpdateTeamResponse | null
> = async ({ query, body }) => {
  const teamIdNumber = Number(query.teamId);
  const updateData = body as IUpdateTeamBody;

  // Info: (20250227 - Shirley) 模擬團隊不存在的情況
  if (teamIdNumber === 404) {
    return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
  }

  return {
    statusMessage: STATUS_MESSAGE.SUCCESS_UPDATE,
    payload: {
      id: teamIdNumber,
      name: updateData.name || 'Default Team',
      about: updateData.about || 'Default Team Description',
      profile: updateData.profile || 'https://www.isunfa.com/profile/123',
      bankInfo: updateData.bankInfo || { code: '001', account: '1234567890' },
    },
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;

  try {
    switch (method) {
      case 'GET':
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      case 'PUT': {
        const { statusMessage, payload } = await withRequestValidation(
          APIName.UPDATE_TEAM_BY_ID,
          req,
          handlePutRequest
        );
        ({ httpCode, result } = formatApiResponse<IUpdateTeamResponse | null>(
          statusMessage,
          payload
        ));
        break;
      }
      default:
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    ({ httpCode, result } = formatApiResponse<null>(
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE],
      null
    ));
  }

  res.status(httpCode).json(result);
}

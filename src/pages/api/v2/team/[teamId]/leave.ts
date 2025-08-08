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
import { getSession, updateTeamMemberSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { ILeaveTeam } from '@/interfaces/team';
import { validateOutputData } from '@/lib/utils/validator';
import { memberLeaveTeam } from '@/lib/utils/repo/team_member.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ILeaveTeam | null = null;

  const isLogin = await checkSessionUser(session, APIName.LEAVE_TEAM, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const isAuth = await checkUserAuthorization(APIName.LEAVE_TEAM, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  loggerBack.info(`User ${userId} is attempting to leave team ${req.query.teamId}`);

  const { query } = checkRequestData(APIName.LEAVE_TEAM, req, session);
  if (query === null || query.teamId === undefined) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { teamId } = query;

  payload = await memberLeaveTeam(userId, teamId);

  // Info: (20250408 - Shirley) 更新用戶的 session 資料，移除團隊
  try {
    await updateTeamMemberSession(userId, teamId, null);
  } catch (error) {
    loggerBack.warn({
      message: 'Failed to update user session after leaving team',
      error,
      userId,
      teamId,
    });
  }

  // Info: (20250226 - Tzuhan) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(APIName.LEAVE_TEAM, payload);

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
    statusMessage = STATUS_MESSAGE.SUCCESS;
  }

  const result = formatApiResponse(statusMessage, payload);
  return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let session = null;

  try {
    if (req.method === HttpMethod.GET) {
      session = await getSession(req);
      ({ httpCode, result } = await handleGetRequest(req));
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (error) {
    loggerBack.error(`error: ${JSON.stringify(error)}`);
    const err = error as Error;
    ({ httpCode, result } = formatApiResponse<null>(
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE],
      null
    ));
  }

  // Info: (20250408 - Shirley) 記錄用戶操作
  if (session) {
    await logUserAction(session, APIName.LEAVE_TEAM, req, result.message);
  }

  res.status(httpCode).json(result);
}

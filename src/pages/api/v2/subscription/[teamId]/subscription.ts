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
import { IUserOwnedTeam } from '@/interfaces/subscription';
import { validateOutputData } from '@/lib/utils/validator';
import { updateSubscription } from '@/lib/utils/repo/team_subscription.repo';

const handlePutRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserOwnedTeam | null = null;

  const isLogin = await checkSessionUser(session, APIName.UPDATE_SUBSCRIPTION, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const isAuth = await checkUserAuthorization(APIName.UPDATE_SUBSCRIPTION, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const { query, body } = checkRequestData(APIName.UPDATE_SUBSCRIPTION, req, session);

  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  try {
    const { plan, autoRenew } = body;
    const teamData = await updateSubscription(userId, query.teamId, { plan, autoRenew });

    if (teamData) {
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      payload = teamData;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  } catch (error) {
    loggerBack.error(`Update subscription failed: ${error}`);
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }

  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.UPDATE_SUBSCRIPTION,
    payload
  );
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  const result = formatApiResponse(statusMessage, payload);
  return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let session = null;

  try {
    if (req.method === 'PUT') {
      session = await getSession(req);
      ({ httpCode, result } = await handlePutRequest(req));
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (error) {
    loggerBack.error(`Error occurred in update subscription: ${error}`);
    const err = error as Error;
    ({ httpCode, result } = formatApiResponse<null>(
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
        STATUS_MESSAGE.INTERNAL_SERVICE_ERROR,
      null
    ));
  }

  if (session) {
    await logUserAction(session, APIName.UPDATE_SUBSCRIPTION, req, result.message);
  }

  res.status(httpCode).json(result);
}

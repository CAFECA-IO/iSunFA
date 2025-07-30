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
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { getTeamPaymentByTeamId, updateTeamPayment } from '@/lib/utils/repo/team_payment.repo';
import { ITeamPayment } from '@/interfaces/payment';
import { IUserOwnedTeam } from '@/interfaces/subscription';
import { getSubscriptionByTeamId } from '@/lib/utils/repo/team_subscription.repo';

const handlePutRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let payload: ITeamPayment | null = null;

  // Info: (20250420 - Luphia) 檢查使用者是否登入
  const isLogin = await checkSessionUser(session, APIName.UPDATE_SUBSCRIPTION, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  // Info: (20250420 - Luphia) 檢查使用者是否有權限
  const isAuth = await checkUserAuthorization(APIName.UPDATE_SUBSCRIPTION, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250420 - Luphia) 檢查請求參數
  const { query, body } = checkRequestData(APIName.UPDATE_SUBSCRIPTION, req, session);

  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  try {
    const { plan, autoRenew } = body;
    const teamPayment = await getTeamPaymentByTeamId(query.teamId);
    if (!teamPayment) {
      // Info: (20250420 - Luphia) 如果沒有找到訂閱資料，則回傳錯誤（需改走 charge 扣款流程）
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }
    teamPayment.autoRenewal = autoRenew || teamPayment.autoRenewal;
    teamPayment.teamPlanType = plan || teamPayment.teamPlanType;
    payload = await updateTeamPayment(teamPayment);
    if (!payload) {
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }
  } catch (error) {
    loggerBack.error(`Update subscription failed: ${error}`);
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }

  // Info: (20250420 - Luphia) 檢驗回傳資料格式
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.UPDATE_SUBSCRIPTION,
    payload
  );
  if (!isOutputDataValid) {
    throw new Error(STATUS_MESSAGE.INVALID_OUTPUT_DATA);
  }

  const result = formatApiResponse(STATUS_MESSAGE.SUCCESS, outputData);
  return result;
};

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let payload: IUserOwnedTeam | null = null;

  // Info: (20250420 - Luphia) 檢查使用者是否登入
  const isLogin = await checkSessionUser(session, APIName.GET_SUBSCRIPTION_BY_TEAM_ID, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  // Info: (20250420 - Luphia) 檢查使用者是否有權限
  const isAuth = await checkUserAuthorization(APIName.GET_SUBSCRIPTION_BY_TEAM_ID, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  // Info: (20250420 - Luphia) 檢查請求參數
  const { query } = checkRequestData(APIName.GET_SUBSCRIPTION_BY_TEAM_ID, req, session);

  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  try {
    const { teamId } = query;
    const team = await getSubscriptionByTeamId(session.userId, teamId);
    payload = team || null;
    // Info: (20250420 - Luphia) 檢驗回傳資料格式
  } catch (error) {
    loggerBack.error(`Update subscription failed: ${error}`);
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.GET_SUBSCRIPTION_BY_TEAM_ID,
    payload
  );
  if (!isOutputDataValid) {
    throw new Error(STATUS_MESSAGE.INVALID_OUTPUT_DATA);
  }

  const result = formatApiResponse(STATUS_MESSAGE.SUCCESS, outputData);
  return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let session = null;

  try {
    if (req.method === HttpMethod.PUT) {
      session = await getSession(req);
      ({ httpCode, result } = await handlePutRequest(req));
    } else if (req.method === HttpMethod.GET) {
      ({ httpCode, result } = await handleGetRequest(req));
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

import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { ITeamInvoice } from '@/interfaces/subscription';
import { checkRequestData, checkSessionUser, checkUserAuthorization } from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { listTeamTransaction } from '@/lib/utils/repo/team_subscription.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const teamId = parseInt(req.query.teamId as string, 10);
  const isLogin = await checkSessionUser(session, APIName.LIST_TEAM_INVOICE, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const isAuth = await checkUserAuthorization(APIName.LIST_TEAM_INVOICE, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const { query } = checkRequestData(APIName.LIST_TEAM_INVOICE, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const options: IPaginatedOptions<ITeamInvoice[]> = await listTeamTransaction(teamId);

  const payload: IPaginatedData<ITeamInvoice[]> = toPaginatedData(options);
  const result = formatApiResponse(STATUS_MESSAGE.SUCCESS, payload);
  return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;

  try {
    switch (method) {
      case HttpMethod.GET:
      default:
        ({ httpCode, result } = await handleGetRequest(req));
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

import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import { ITeamInvoice } from '@/interfaces/subscription';
import { checkRequestData, checkSessionUser, checkUserAuthorization } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { FAKE_INVOICE_LIST } from '@/lib/services/subscription_service';

const handleGetRequest = async (req: NextApiRequest) => {
  let statusMessage = STATUS_MESSAGE.BAD_REQUEST;

  const session = await getSession(req);

  const isLogin = await checkSessionUser(session, APIName.LIST_TEAM_INVOICE, req);
  if (!isLogin) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    throw new Error(statusMessage);
  }
  const isAuth = await checkUserAuthorization(APIName.LIST_TEAM_INVOICE, req, session);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
    throw new Error(statusMessage);
  }
  const { query, body } = checkRequestData(APIName.LIST_TEAM_INVOICE, req, session);
  if (query === null || body === null) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    throw new Error(statusMessage);
  }
  const options: IPaginatedOptions<ITeamInvoice[]> = {
    data: FAKE_INVOICE_LIST,
  };
  const payload: IPaginatedData<ITeamInvoice[]> = toPaginatedData(options);
  const result = formatApiResponse(statusMessage, payload);
  return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;

  try {
    switch (method) {
      case 'GET':
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

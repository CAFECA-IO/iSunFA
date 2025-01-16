import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { ITeamInvoice } from '@/interfaces/subscription';
import { checkRequestData, checkSessionUser, checkUserAuthorization } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { FAKE_INVOICE_LIST } from '@/lib/services/subscription_service';

const handleGetRequest = async (req: NextApiRequest) => {
  let statusMessage = STATUS_MESSAGE.BAD_REQUEST;

  const session = await getSession(req);

  const isLogin = await checkSessionUser(session, APIName.GET_TEAM_INVOICE_BY_ID, req);
  if (!isLogin) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    throw new Error(statusMessage);
  }
  const isAuth = await checkUserAuthorization(APIName.GET_TEAM_INVOICE_BY_ID, req, session);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
    throw new Error(statusMessage);
  }
  const { query, body } = checkRequestData(APIName.GET_TEAM_INVOICE_BY_ID, req, session);
  if (query === null || body === null) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    throw new Error(statusMessage);
  }
  const payload: ITeamInvoice | null =
    FAKE_INVOICE_LIST.find((invoice) => invoice.id === query.invoiceId) || null;
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

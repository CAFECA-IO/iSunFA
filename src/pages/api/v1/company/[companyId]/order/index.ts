import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getSession } from '@/lib/utils/session';
import { createOrder, listOrder } from '@/lib/utils/repo/order.repo';
import { IOrder } from '@/interfaces/order';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<IOrder[]>>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IOrder[] | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      try {
        const orderList = await listOrder(companyId);
        statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
        payload = orderList;
      } catch (error) {
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
    }
  }

  return { statusMessage, payload };
}

async function handlePostRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<IOrder>>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IOrder | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { planId, status } = req.body;
      if (!planId || !status) {
        statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      } else {
        try {
          const order = await createOrder(companyId, planId, status);
          statusMessage = STATUS_MESSAGE.CREATED;
          payload = order;
        } catch (error) {
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        }
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IOrder | IOrder[]>>
  ) => Promise<{ statusMessage: string; payload: IOrder | IOrder[] | null }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IOrder | IOrder[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IOrder | IOrder[] | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IOrder | IOrder[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}

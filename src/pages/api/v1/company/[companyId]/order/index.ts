import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { isUserAdmin } from '@/lib/utils/auth_check';
import { getSession } from '@/lib/utils/session';
import { createOrder, listOrder } from '@/lib/utils/repo/order.repo';
import { IOrder } from '@/interfaces/order';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IOrder | IOrder[]>>
) {
  let shouldContinue: boolean = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = {} as IOrder | IOrder[];
  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    if (req.method !== 'GET' && req.method !== 'POST') {
      shouldContinue = false;
    }
    if (shouldContinue) {
      shouldContinue = await isUserAdmin(userId, companyId);
    }
    if (req.method === 'GET' && shouldContinue) {
      const orderList = await listOrder(companyId);
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
      payload = orderList;
      // Info: (20240419 - Jacky) S010002 - POST /project
    } else if (req.method === 'POST' && shouldContinue) {
      const { planId, status } = req.body;
      if (!planId || !status) {
        shouldContinue = false;
      }
      if (shouldContinue) {
        const order: IOrder = await createOrder(companyId, planId, status);
        statusMessage = STATUS_MESSAGE.CREATED;
        payload = order;
      }
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = {} as IOrder | IOrder[];
  }
  const { httpCode, result } = formatApiResponse<IOrder | IOrder[]>(statusMessage, payload);
  res.status(httpCode).json(result);
}

import { STATUS_CODE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ISubscription } from '@/interfaces/subscription';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISubscription>>
) {
  const { method } = req;

  try {
    if (!req.headers.userId) {
      throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
    }
    if (!req.query.id) {
      throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
    }
    if (req.query.id !== '1') {
      throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
    }
    if (method === 'GET') {
      const subscription: ISubscription = {
        id: '1',
        companyId: 'company-id',
        companyName: 'mermer',
        plan: 'pro',
        paymentId: '1',
        price: 'USD 10',
        autoRenew: true,
        expireDate: 1274812,
        status: 'paid',
      };
      const { httpCode, result } = formatApiResponse<ISubscription>(
        STATUS_CODE.SUCCESS_GET,
        subscription
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010003 - PUT /subscription/:id
    } else if (method === 'PUT') {
      const { plan, paymentId, autoRenew } = req.body;
      if (!plan || !paymentId || autoRenew == null) {
        throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
      }
      const subscription: ISubscription = {
        id: '1',
        companyId: 'company-id',
        companyName: 'mermer',
        plan,
        paymentId,
        price: 'USD 10',
        autoRenew,
        expireDate: 1237468124,
        status: 'paid',
      };
      subscription.plan = plan;
      subscription.paymentId = paymentId;
      const { httpCode, result } = formatApiResponse<ISubscription>(
        STATUS_CODE.SUCCESS_UPDATE,
        subscription
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010004 - DELETE /subscription/:id
    } else if (method === 'DELETE') {
      const subscription: ISubscription = {
        id: '1',
        companyId: 'company-id',
        companyName: 'mermer',
        plan: 'pro',
        paymentId: '1',
        price: 'USD 10',
        autoRenew: true,
        expireDate: 1237468124,
        status: 'paid',
      };
      const { httpCode, result } = formatApiResponse<ISubscription>(
        STATUS_CODE.SUCCESS_DELETE,
        subscription
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_CODE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ISubscription>(
      error.message,
      {} as ISubscription
    );
    res.status(httpCode).json(result);
  }
}

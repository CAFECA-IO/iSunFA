import { NextApiRequest, NextApiResponse } from 'next';
import { ISubscription } from '@/interfaces/subscription';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_CODE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISubscription | ISubscription[]>>
) {
  try {
    if (!req.headers.userId) {
      throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
    }
    // Info: (20240419 - Jacky) S010001 - GET /subscription
    if (req.method === 'GET') {
      const subscriptionList: ISubscription[] = [
        {
          id: '1',
          companyId: 'company-id',
          companyName: 'mermer',
          plan: 'pro',
          paymentId: '1',
          price: 'USD 10',
          autoRenew: true,
          expireDate: 2184719248,
          status: 'paid',
        },
      ];
      const { httpCode, result } = formatApiResponse<ISubscription[]>(
        STATUS_CODE.SUCCESS_LIST,
        subscriptionList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010002 - POST /subscription
    } else if (req.method === 'POST') {
      const { plan, paymentId, autoRenew } = req.body;
      if (!plan || !paymentId || !autoRenew) {
        throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
      }
      const newSubscription: ISubscription = {
        id: '3',
        companyId: 'company-id',
        companyName: 'mermer',
        plan,
        paymentId,
        price: 'USD 10',
        autoRenew,
        expireDate: 1746187324,
        status: 'paid',
      };
      const { httpCode, result } = formatApiResponse<ISubscription>(
        STATUS_CODE.CREATED,
        newSubscription
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

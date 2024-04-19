import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import type { ResponseData } from '../../../../type/iresponsedata';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    if (req.method === 'GET') {
      if (!req.headers.userId) {
        throw new Error('Resource not found');
      }
      const subscriptionList = [
        {
          id: '1',
          entity: 'mermer',
          plan: 'pro',
          paymentId: '1',
          price: 'USD 10',
          autoRenew: true,
          expireDate: '2024-01-01',
          status: 'paid',
        },
      ];
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'list all subscriptions',
        payload: subscriptionList,
      });
    } else if (req.method === 'POST') {
      if (!req.headers.userId) {
        throw new Error('Resource not found');
      }
      const { plan, paymentId, autoRenew } = req.body;
      if (!plan || !paymentId || !autoRenew) {
        throw new Error('Invalid input parameter');
      }
      const newSubscription = {
        id: '3',
        entity: 'mermer',
        plan,
        paymentId,
        price: 'USD 10',
        autoRenew,
        expireDate: '2024-01-01',
        status: 'paid',
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create subscription',
        payload: newSubscription,
      });
    } else {
      throw new Error('Method Not Allowed');
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}

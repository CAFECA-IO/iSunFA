import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import { ISubscription } from '@/interfaces/subscription';
import { IResponseData } from '../../../../../../interfaces/response_data';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISubscription>>
) {
  try {
    if (!req.headers.userId) {
      throw new Error('Resource not found');
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'list all subscriptions',
        payload: subscriptionList,
      });
      // Info: (20240419 - Jacky) S010002 - POST /subscription
    } else if (req.method === 'POST') {
      const { plan, paymentId, autoRenew } = req.body;
      if (!plan || !paymentId || !autoRenew) {
        throw new Error('Invalid input parameter');
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

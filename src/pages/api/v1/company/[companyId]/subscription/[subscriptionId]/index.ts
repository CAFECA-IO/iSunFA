import { IResponseData } from '@/interfaces/response_data';
import { ISubscription } from '@/interfaces/subscription';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISubscription>>
) {
  const { method } = req;

  try {
    if (!req.headers.userId) {
      throw new Error('Resource not found');
    }
    if (!req.query.id) {
      throw new Error('Invalid input parameter');
    }
    if (req.query.id !== '1') {
      throw new Error('Resource not found');
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'get subscription by id',
        payload: subscription,
      });
      // Info: (20240419 - Jacky) S010003 - PUT /subscription/:id
    } else if (method === 'PUT') {
      const { plan, paymentId, autoRenew } = req.body;
      if (!plan || !paymentId || autoRenew == null) {
        throw new Error('Invalid input parameter');
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'update subscription',
        payload: subscription,
      });
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'delete subscription ' + subscription.id + ' successfully',
        payload: subscription,
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

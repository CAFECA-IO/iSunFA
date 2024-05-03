import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';
import version from '../../../../../../../lib/version';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

describe('test subscription API by id', () => {
  it('should get subscription by id', async () => {
    req.method = 'GET';
    req.headers.userId = '1';
    req.query.id = '1';
    await handler(req, res);
    const subscription = {
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
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'get subscription by id',
      payload: subscription,
    });
  });

  it('should update subscription', async () => {
    req.method = 'PUT';
    req.headers.userId = '1';
    req.query.id = '1';
    req.body = {
      plan: 'basic',
      paymentId: '2',
      autoRenew: false,
    };
    await handler(req, res);
    const updatedSubscription = {
      id: '1',
      companyId: 'company-id',
      companyName: 'mermer',
      plan: 'basic',
      paymentId: '2',
      price: 'USD 10',
      autoRenew: false,
      expireDate: 1237468124,
      status: 'paid',
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'update subscription',
      payload: updatedSubscription,
    });
  });

  it('should delete subscription', async () => {
    req.method = 'DELETE';
    req.headers.userId = '1';
    req.query.id = '1';
    await handler(req, res);
    const deletedSubscription = {
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
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'delete subscription ' + deletedSubscription.id + ' successfully',
      payload: deletedSubscription,
    });
  });

  it('should handle invalid input parameter', async () => {
    req.method = 'GET';
    req.headers.userId = 'user-id';
    req.query.id = '';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '422',
      message: 'Invalid input parameter',
      payload: {},
    });
  });

  it('should handle resource not found', async () => {
    req.method = 'GET';
    req.headers.userId = 'user-id';
    req.query.id = '2';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '404',
      message: 'Resource not found',
      payload: {},
    });
  });

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'POST';
    req.headers.userId = 'user-id';
    req.query.id = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '405',
      message: 'Method Not Allowed',
      payload: {},
    });
  });
});

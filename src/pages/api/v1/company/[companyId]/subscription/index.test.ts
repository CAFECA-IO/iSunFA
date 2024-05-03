import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';
import version from '../../../../../../lib/version';

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

describe('test subscription API', () => {
  it('should list all subscriptions', async () => {
    req.headers.userId = '1';
    await handler(req, res);
    const subscriptions = [
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
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'list all subscriptions',
      payload: subscriptions,
    });
  });

  it('should create a new subscription', async () => {
    req.headers.userId = '1';
    req.method = 'POST';
    req.body = {
      plan: 'pro',
      paymentId: '2',
      autoRenew: true,
    };
    await handler(req, res);
    const newSubscription = {
      id: '3',
      companyId: 'company-id',
      companyName: 'mermer',
      plan: 'pro',
      paymentId: '2',
      price: 'USD 10',
      autoRenew: true,
      expireDate: 1746187324,
      status: 'paid',
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'create subscription',
      payload: newSubscription,
    });
  });

  it('should handle unsupported HTTP methods', async () => {
    req.headers.userId = '1';
    req.method = 'PUT';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '405',
      payload: {},
      message: 'Method Not Allowed',
    });
  });
});

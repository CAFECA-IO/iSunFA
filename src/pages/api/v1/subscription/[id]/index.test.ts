import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './index';

let req: NextApiRequest;
let res: NextApiResponse;

beforeEach(() => {
  req = {
    method: '',
    headers: {},
    body: {},
    query: {},
  } as NextApiRequest;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as NextApiResponse;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Subscription API handler', () => {
  it('should return a subscription by id when method is GET', async () => {
    req.method = 'GET';
    req.headers.userId = 'user123';
    req.query.id = '1';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'get subscription by id',
      payload: {
        id: '1',
        entity: 'mermer',
        plan: 'pro',
        paymentId: '1',
        price: 'USD 10',
        autoRenew: true,
        expireDate: '2024-01-01',
        status: 'paid',
      },
    });
  });

  it('should update a subscription by id when method is PUT', async () => {
    req.method = 'PUT';
    req.headers.userId = 'user123';
    req.query.id = '1';
    req.body = {
      plan: 'pro',
      paymentId: '1',
      autoRenew: true,
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'update subscription',
      payload: {
        id: '1',
        entity: 'mermer',
        plan: 'pro',
        paymentId: '1',
        price: 'USD 10',
        autoRenew: true,
        expireDate: '2024-01-01',
        status: 'paid',
      },
    });
  });

  it('should delete a subscription by id when method is DELETE', async () => {
    req.method = 'DELETE';
    req.headers.userId = 'user123';
    req.query.id = '1';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'delete subscription 1 successfully',
      payload: {
        id: '1',
        entity: 'mermer',
        plan: 'pro',
        paymentId: '1',
        price: 'USD 10',
        autoRenew: true,
        expireDate: '2024-01-01',
        status: 'paid',
      },
    });
  });

  it('should return an error when method is not allowed', async () => {
    req.method = 'POST';
    req.headers.userId = 'user123';
    req.query.id = '1';

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

  it('should return an error when userId is missing', async () => {
    req.method = 'GET';
    req.query.id = '1';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '404',
      payload: {},
      message: 'Resource not found',
    });
  });

  it('should return an error when id is missing', async () => {
    req.method = 'GET';
    req.headers.userId = 'user123';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '422',
      payload: {},
      message: 'Invalid input parameter',
    });
  });

  it('should return an error when id is not found', async () => {
    req.method = 'GET';
    req.headers.userId = 'user123';
    req.query.id = '2';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '404',
      payload: {},
      message: 'Resource not found',
    });
  });
});

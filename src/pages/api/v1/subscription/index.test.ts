import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: {},
    method: '',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('API Handler Tests', () => {
  it('should list subsciptions', async () => {
    req.method = 'GET';
    req.headers.userId = '123';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: true,
      code: '200',
      message: 'list all subscriptions',
      payload: [
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
      ],
    });
  });

  it('should create new subscription', async () => {
    req.method = 'POST';
    req.headers.userId = '123';
    req.body = {
      plan: 'pro',
      paymentId: '1',
      autoRenew: true,
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: true,
      code: '200',
      message: 'create subscription',
      payload: {
        id: '3',
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

  it('should return error for missing userId', async () => {
    req.method = 'POST';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '404',
      message: 'Resource not found',
      payload: {},
    });
  });

  it('should return error for missing input parameter', async () => {
    req.method = 'POST';
    req.headers.userId = '123';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '422',
      message: 'Invalid input parameter',
      payload: {},
    });
  });

  it('should return error for invalid method', async () => {
    req.method = 'PUT';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '405',
      message: 'Method Not Allowed',
      payload: {},
    });
  });
});

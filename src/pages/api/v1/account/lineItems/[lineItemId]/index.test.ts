import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index'; // Update the import path to the actual location of your handler function

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: {},
    query: {},
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
  it('should return 400 for invalid lineItemId', async () => {
    req.query = { lineItemId: '' }; // Invalid lineItemId
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Invalid lineItemId',
    });
  });

  it('should handle successful GET requests with valid inputs', async () => {
    req.query = { lineItemId: '1229001001' }; // Valid inputs
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'success',
      data: {
        lineItemIndex: '1229001001',
        account: '銀行存款',
        description: '港幣120000 * 3.916',
        debit: true,
        amount: 469920,
      },
    });
  });

  it('should return 405 for unsupported methods', async () => {
    req.query = { lineItemId: '1229001001' }; // Valid inputs
    req.method = 'POST'; // Unsupported method

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Method Not Allowed',
    });
  });
});

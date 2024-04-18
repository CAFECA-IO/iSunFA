import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './index'; // Update with the actual import path if necessary

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
  it('should return 400 for invalid page and limit values', async () => {
    req.query = { page: '0', limit: '-1' }; // Invalid query parameters
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Invalid page or limit, must be positive integer number',
    });
  });

  it('should handle successful GET requests with valid page and limit', async () => {
    req.query = { page: '1', limit: '10' }; // Valid query parameters
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: true,
      code: '200',
      message: 'List of vouchers return successfully',
      payload: [
        {
          date: '2024-12-29',
          vouchIndex: '1229001',
          type: 'Receiving',
          from_or_to: 'Isuncloud Limited',
          description: '技術開發軟件與服務',
          lineItem: [
            {
              lineItemIndex: '1229001001',
              account: '銀行存款',
              description: '港幣120000 * 3.916',
              debit: true,
              amount: 469920,
            },
            {
              lineItemIndex: '1229001002',
              account: '營業收入',
              description: '港幣120000 * 3.916',
              debit: false,
              amount: 469920,
            },
          ],
        },
      ],
    });
  });

  it('should return 405 for unsupported methods', async () => {
    req.method = 'POST'; // Unsupported method

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '405',
      message: 'Method Not Allowed in vouchers api',
    });
  });
});

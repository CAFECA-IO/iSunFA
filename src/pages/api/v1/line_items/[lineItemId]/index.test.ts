import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index'; // Update the import path to where your actual handler is located
import version from '../../../../../lib/version'; // Make sure this path is correct to import 'version'

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
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Invalid lineItemId',
    });
  });

  it('should handle successful GET requests with valid lineItemId', async () => {
    req.query = { lineItemId: '1229001001' }; // Valid lineItemId
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: true,
      code: '200',
      message: 'Line item return successfully',
      payload: {
        lineItemIndex: '1229001001',
        account: '銀行存款',
        description: '港幣120000 * 3.916',
        debit: true,
        amount: 469920,
      },
    });
  });

  it('should return 405 for unsupported methods', async () => {
    req.query = { lineItemId: '1229001001' };
    req.method = 'POST'; // Unsupported method

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '405',
      message: 'Method Not Allowed in line items api',
    });
  });
});

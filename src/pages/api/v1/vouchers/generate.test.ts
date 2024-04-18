import { NextApiRequest, NextApiResponse } from 'next';
import handler from './generate'; // Update with the actual import path
import { isAccountVoucher } from '../../../../interfaces/account';
// Mocking the utility function isAccountVoucher from '@/interfaces/account'
jest.mock('../../../../interfaces/account', () => ({
  isAccountVoucher: jest.fn(),
}));

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
  it('should return 400 for invalid voucher POST requests', async () => {
    req.body.voucher = ['not', 'valid']; // Invalid voucher as an array
    req.method = 'POST';
    (isAccountVoucher as unknown as jest.Mock).mockReturnValue(false);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Invalid voucher',
    });
  });

  it('should handle successful POST requests', async () => {
    req.body.voucher = { valid: true }; // Assume this is a valid voucher
    req.method = 'POST';
    (isAccountVoucher as unknown as jest.Mock).mockReturnValue(true);

    await handler(req, res);

    expect(isAccountVoucher).toHaveBeenCalledWith({ valid: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'success',
      data: {
        resultId: '1229001',
        status: 'success',
      },
    });
  });

  it('should return 405 for unsupported methods', async () => {
    req.method = 'GET'; // Unsupported method

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Method Not Allowed',
    });
  });
});

import { NextApiRequest, NextApiResponse } from 'next';
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
  it('should validate page and limit are positive integers', async () => {
    req.query = { page: '0', limit: '-1' }; // Invalid query parameters
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Invalid page or limit, must be positive integer number',
    });
  });

  it('should handle successful GET requests', async () => {
    req.query = { page: '1', limit: '10' }; // Valid query parameters
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'success',
      data: expect.any(Array), // The exact data check could be more specific if needed
    });
  });

  it('should return 405 for unsupported methods', async () => {
    req.method = 'POST'; // Unsupported method

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Method Not Allowed',
    });
  });
});

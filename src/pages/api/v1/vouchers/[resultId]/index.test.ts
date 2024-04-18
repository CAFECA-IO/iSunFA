import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index'; // Update the import path to the actual location of your handler

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
  it('should return 400 for invalid resultId', async () => {
    req.query = { resultId: '', page: '2', limit: '3' };
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Invalid resultId',
    });
  });

  it('should validate page and limit as positive integers', async () => {
    req.query = { resultId: '123', page: '0', limit: '-1' };
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Invalid page or limit, must be positive integer number',
    });
  });

  it('should handle successful GET requests', async () => {
    req.query = { resultId: '123', page: '1', limit: '10' };
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'success',
      data: expect.objectContaining({
        date: '2024-12-29',
        vouchIndex: '1229001',
        type: 'Receiving',
        from_or_to: 'Isuncloud Limited',
        description: '技術開發軟件與服務',
        lineItem: expect.any(Array),
      }),
    });
  });

  it('should return 405 for unsupported methods', async () => {
    req.query = { resultId: '123', page: '1', limit: '10' };
    req.method = 'POST'; // Unsupported method

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Method Not Allowed',
    });
  });
});

import { NextApiRequest, NextApiResponse } from 'next';
import handler from './process_statue'; // Ensure this path matches the actual file location

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: null,
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

describe('Result API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.query.resultId = '123'; // Valid resultId as a string
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'success',
      status: 'success',
    });
  });

  it('should return error for non-string resultId', async () => {
    req.query.resultId = ['123']; // resultId as an array to simulate invalid input
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Invalid resultId',
      status: 'error',
    });
  });

  it('should return error for missing resultId', async () => {
    req.query = {}; // No resultId provided
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Invalid resultId',
      status: 'error',
    });
  });

  it('should return error for unsupported HTTP methods', async () => {
    req.query.resultId = '123'; // Correct resultId
    req.method = 'POST'; // Unsupported method

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      message: 'error',
      errorReason: 'Method Not Allowed',
      status: 'error',
    });
  });
});

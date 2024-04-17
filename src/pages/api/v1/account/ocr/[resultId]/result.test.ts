import { NextApiRequest, NextApiResponse } from 'next';
import handler from './result'; // Adjust the import path as necessary

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>; // Use <any> to avoid type errors with custom response types

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

describe('OCR Result API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.query.resultId = '123'; // Valid resultId as a string
    req.method = 'GET';

    const mockOcrReturnArray = [
      {
        date: '2024-12-29',
        eventType: 'income',
        incomeReason: '勞務收入',
        client: 'Isuncloud Limited',
        description: '技術開發軟件與服務',
        price: '469920',
        tax: 'free',
        taxPercentange: 'null',
        fee: '0',
      },
    ];
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'success',
      data: mockOcrReturnArray,
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
      data: [],
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
      data: [],
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
      data: [],
    });
  });
});

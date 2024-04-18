import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
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
    const resultId = '123';
    req.query.resultId = resultId; // Valid resultId as a string
    req.query.resultId = '123'; // Valid resultId as a string
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '200',
      message: `OCR analyzing progress status of id:${resultId} return successfully`,
      payload: 'success',
    });
  });

  it('should return error for non-string resultId', async () => {
    req.query.resultId = ['123']; // resultId as an array to simulate invalid input
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Reason why request has failed',
    });
  });

  it('should return error for missing resultId', async () => {
    req.query = {}; // No resultId provided
    req.method = 'GET';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Reason why request has failed',
    });
  });

  it('should return error for unsupported HTTP methods', async () => {
    req.query.resultId = '123'; // Correct resultId
    req.method = 'POST'; // Unsupported method

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Method Not Allowed in ocr process status api',
    });
  });
});

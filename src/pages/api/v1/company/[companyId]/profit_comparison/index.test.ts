import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';

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
    req.method = 'GET';
    req.query = {
      currentPage: '1',
      itemsPerPage: '10',
      startDate: '2024-04-01',
      endDate: '2024-05-01',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const expectedPayload = expect.objectContaining({
      startDate: expect.any(Number),
      endDate: expect.any(Number),
      currentPage: expect.any(Number),
      totalPages: expect.any(Number),
      categories: expect.arrayContaining([expect.any(String)]),
      series: expect.arrayContaining([expect.arrayContaining([expect.any(Number)])]),
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expectedPayload,
      })
    );
  });
  it('should return error if some query element is missing', async () => {
    req.method = 'GET';
    req.query = { page: '1', limit: '10' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('422'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });
});

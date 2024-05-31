import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    query: {},
    method: '',
    json: jest.fn(),
    body: {},
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('getOwnAccounts API Handler Tests', () => {
  it('should return all response data when type and liquidity query params are provided correctly', async () => {
    req.method = 'GET';
    req.query = { type: 'asset', liquidity: 'false' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            code: expect.any(Number),
            account: expect.any(String),
            amount: expect.any(Number),
          }),
        ]),
      })
    );
  });
  it('should return a error when type and liquidity query params are not provided', async () => {
    req.method = 'GET';
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
  it('should return a error when type and liquidity query params are not provided correctly', async () => {
    req.method = 'GET';
    req.query = { type: 'money', liquidity: 'true' };
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

describe('createNewAccountingAccount API Handler Tests', () => {
  it('should create new accounting account when all body params are provided', async () => {
    req.method = 'POST';
    req.body = {
      type: 'asset',
      liquidity: false,
      account: 'cash',
      code: '1103-1',
      name: 'Taiwan Bank',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('201'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          type: expect.any(String),
          liquidity: expect.any(Boolean),
          account: expect.any(String),
          code: expect.any(String),
          name: expect.any(String),
        }),
      })
    );
  });
  it('should return a error when required body params are missing', async () => {
    req.method = 'POST';
    req.body = {
      type: 'asset',
      liquidity: true,
      code: '1103',
    };
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

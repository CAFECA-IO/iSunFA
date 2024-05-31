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

describe('updateOwnAccountInfoById API Handler Tests', () => {
  it('should update the information of owned account successfully', async () => {
    req.method = 'PUT';
    req.query = { accountId: '1' };
    req.body = {
      type: 'asset',
      liquidity: false,
      account: 'cash',
      code: '1103-2',
      name: 'Sun Bank',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
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
  it('should return error if some body element is missing', async () => {
    req.method = 'PUT';
    req.query = { accountId: '1' };
    req.body = {
      type: 'asset',
      liquidity: false,
      code: '1103-2',
      name: 'Sun Bank',
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

describe('deleteOwnAccountById API Handler Tests', () => {
  it('should successfully delete an owned account', async () => {
    req.method = 'DELETE';
    req.query = { accountId: '1' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: null,
      })
    );
  });

  it('should return error if id is not provided', async () => {
    req.method = 'DELETE';
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

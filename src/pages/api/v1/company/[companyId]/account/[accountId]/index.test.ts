import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/[companyId]/account/index';
import prisma from '@/client';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const testAccountId = 100000000;

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

  jest.spyOn(prisma.account, 'findMany').mockResolvedValue([
    {
      id: testAccountId,
      type: 'asset',
      liquidity: true,
      account: 'cash',
      code: '1103-1',
      name: 'Sun Bank',
      createdAt: 1000000000,
      updatedAt: 1000000000,
    },
  ]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('API Handler Tests for Various Query Parameters', () => {
  it('should return accounts when all query params are provided correctly', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', type: 'asset', liquidity: 'true', page: '1', limit: '10' };
    await handler(req, res);
    const accountExpect = expect.objectContaining({
      id: expect.any(Number),
      type: expect.any(String),
      liquidity: expect.any(Boolean),
      account: expect.any(String),
      code: expect.any(String),
      name: expect.any(String),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    const accountArrayExpect = expect.arrayContaining([accountExpect]);

    const jsonExpect = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: accountArrayExpect,
    });
    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(jsonExpect);
  });

  it('should return error when required query params are missing (only companyId is require)', async () => {
    req.method = 'GET';
    req.query = { type: 'asset' }; // Missing companyId
    await handler(req, res);

    const jsonExpect = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    expect(res.status).toHaveBeenCalledWith(422);

    expect(res.json).toHaveBeenCalledWith(jsonExpect);
  });

  it('should return error when companyId is not a number', async () => {
    req.method = 'GET';
    req.query = { companyId: 'abc', type: 'asset', liquidity: 'true', page: '1', limit: '10' };
    await handler(req, res);

    const jsonExpect = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(jsonExpect);
  });

  it('should return error when type is invalid', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', type: 'invalid', liquidity: 'true', page: '1', limit: '10' };

    const jsonExpect = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(jsonExpect);
  });

  it('should return error when liquidity is invalid', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', type: 'asset', liquidity: 'invalid', page: '1', limit: '10' };

    const jsonExpect = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(jsonExpect);
  });

  it('should return error when page is not a number', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', type: 'asset', liquidity: 'true', page: 'abc', limit: '10' };

    const jsonExpect = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(jsonExpect);
  });

  it('should return error when limit is not a number', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', type: 'asset', liquidity: 'true', page: '1', limit: 'abc' };

    const jsonExpect = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(jsonExpect);
  });
});

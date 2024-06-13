import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/[companyId]/account/index';
import prisma from '@/client';
import { IAccount } from '@/interfaces/accounting_account';
import * as authCheck from '@/lib/utils/auth_check';

jest.mock('../../../../../../lib/utils/auth_check', () => {
  return {
    checkAdmin: jest.fn(),
  };
});

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const testAccountId = 100000000;
const companyId = 1;
const session = {
  companyId,
  // Info (20240516 - Murky) - Mocking session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

beforeEach(() => {
  jest.spyOn(authCheck, 'checkAdmin').mockResolvedValue(session);
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

  const mockAccounts: IAccount[] = [
    {
      id: testAccountId,
      companyId,
      system: 'IFRS',
      type: 'asset',
      debit: true,
      liquidity: true,
      code: '1103-1',
      name: 'Sun Bank',
      createdAt: 1000000000,
      updatedAt: 1000000000,
    }
  ];

  jest.spyOn(prisma.account, 'findMany').mockResolvedValue(mockAccounts);
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
      companyId: expect.any(Number),
      system: expect.any(String),
      type: expect.any(String),
      liquidity: expect.any(Boolean),
      code: expect.any(String),
      name: expect.any(String),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    const accountArrayExpect = expect.arrayContaining([accountExpect]);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: accountArrayExpect,
    });
    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return error when type is invalid', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', type: 'invalid', liquidity: 'true', page: '1', limit: '10' };

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return error when liquidity is invalid', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', type: 'asset', liquidity: 'invalid', page: '1', limit: '10' };

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return error when page is not a number', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', type: 'asset', liquidity: 'true', page: 'abc', limit: '10' };

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return error when limit is not a number', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', type: 'asset', liquidity: 'true', page: '1', limit: 'abc' };

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });
});

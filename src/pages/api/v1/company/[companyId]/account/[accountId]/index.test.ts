import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/[companyId]/account/[accountId]/index';
import prisma from '@/client';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const testAccountId = -1;
beforeAll(async () => {
  await prisma.account.create({
    data: {
      id: testAccountId,
      type: 'asset',
      liquidity: true,
      account: 'cash',
      code: '1103-1',
      name: 'Sun Bank',
      createdAt: 1000000000,
      updatedAt: 1000000000,
    },
  });
});

afterAll(async () => {
  await prisma.account
    .delete({
      where: {
        id: testAccountId,
      },
    })
    .catch();
  await prisma.$disconnect();
});

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

describe('GET account by id', () => {
  it('should return account when account id is provided correctly', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', accountId: `${testAccountId}` };
    await handler(req, res);

    const paymentExpect = expect.objectContaining({
      id: expect.any(Number),
      type: expect.any(String),
      liquidity: expect.any(Boolean),
      account: expect.any(String),
      code: expect.any(String),
      name: expect.any(String),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: true,
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: paymentExpect,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return an error when account id is not found', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', accountId: '-2' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: false,
      code: expect.stringContaining('404'),
      message: expect.any(String),
    });

    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return an error when account id is not a number', async () => {
    req.method = 'GET';
    req.query = { companyId: '1', accountId: 'a' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: false,
      code: expect.stringContaining('422'),
      message: expect.any(String),
    });

    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });
});

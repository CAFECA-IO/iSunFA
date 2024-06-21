import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { IAdmin } from '@/interfaces/admin';
import { ROLE_NAME } from '@/constants/role_name';
import { formatAdmin } from '@/lib/utils/formatter/admin.formatter';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let admin: IAdmin;

beforeEach(async () => {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const createdAdmin = await prisma.admin.create({
    data: {
      user: {
        connectOrCreate: {
          where: {
            credentialId: 'company_index2_test',
          },
          create: {
            name: 'John',
            credentialId: 'company_index2_test',
            publicKey: 'publicKey',
            algorithm: 'ES256',
            imageId: 'imageId',
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      role: {
        connectOrCreate: {
          where: {
            name: ROLE_NAME.OWNER,
          },
          create: {
            name: ROLE_NAME.OWNER,
            permissions: ['hihi', 'ooo'],
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      company: {
        connectOrCreate: {
          where: {
            code: 'TST_company_11',
          },
          create: {
            code: 'TST_company_11',
            name: 'Test Company',
            regional: 'TW',
            kycStatus: false,
            imageId: 'imageId',
            startDate: nowTimestamp,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      email: 'company_index2_test@test',
      status: true,
      startDate: nowTimestamp,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  admin = await formatAdmin(createdAdmin);

  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    session: { userId: admin.user.id, companyId: admin.company.id },
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.admin.delete({
      where: {
        id: admin.id,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.user.delete({
      where: {
        id: admin.user.id,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.company.delete({
      where: {
        id: admin.company.id,
      },
    });
  } catch (error) {
    /* empty */
  }
});

describe('companyId handler', () => {
  it('should handle GET method', async () => {
    req.method = 'GET';
    req.headers = { userid: '123' };
    req.query = { companyId: admin.company.id.toString() };

    await handler(req, res);
    const expectedCompany = expect.objectContaining({
      id: expect.any(Number),
      code: expect.any(String),
      name: expect.any(String),
      regional: expect.any(String),
      kycStatus: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedCompany,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle PUT method', async () => {
    req.method = 'PUT';
    req.query = { companyId: admin.company.id.toString() };
    req.body = { name: 'Company B', regional: 'US' };

    await handler(req, res);
    const expectedCompany = expect.objectContaining({
      id: expect.any(Number),
      code: expect.any(String),
      name: expect.any(String),
      regional: expect.any(String),
      kycStatus: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedCompany,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  xit('should handle DELETE method', async () => {
    req.method = 'DELETE';
    req.headers = { userid: '123' };
    req.query = { companyId: admin.company.id.toString() };

    await handler(req, res);

    const expectedCompany = expect.objectContaining({
      id: expect.any(Number),
      code: expect.any(String),
      name: expect.any(String),
      regional: expect.any(String),
      kycStatus: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedCompany,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle invalid method', async () => {
    req.method = 'POST';
    req.headers = { userid: '123' };
    req.query = { companyId: admin.company.id.toString() };

    await handler(req, res);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('405'),
      message: expect.any(String),
      payload: expect.any(Object),
    });
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle missing userid header', async () => {
    req.method = 'GET';
    req.query = { companyId: '456' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('404'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should handle missing companyId query parameter', async () => {
    req.method = 'GET';
    req.headers = { userid: '123' };

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

  it('should handle invalid input parameters for PUT method', async () => {
    req.method = 'PUT';
    req.headers = { userid: '123' };
    req.query = { companyId: admin.company.id.toString() };
    req.body = {};

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

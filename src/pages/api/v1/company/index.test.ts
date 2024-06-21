import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/index';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { IAdmin } from '@/interfaces/admin';
import { formatAdmin } from '@/lib/utils/formatter/admin.formatter';

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
            credentialId: 'company_index_test',
          },
          create: {
            name: 'John',
            credentialId: 'company_index_test',
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
            name: 'COMPANY_ADMIN',
          },
          create: {
            name: 'COMPANY_ADMIN',
            permissions: ['hihi', 'ooo'],
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      company: {
        connectOrCreate: {
          where: {
            code: 'TST_company_user1',
          },
          create: {
            code: 'TST_company_user1',
            name: 'Test Company',
            regional: 'TW',
            startDate: nowTimestamp,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
            kycStatus: false,
            imageId: 'imageId',
          },
        },
      },
      email: 'company_index_test@test',
      status: true,
      startDate: nowTimestamp,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      user: true,
      role: true,
      company: true,
    },
  });
  admin = await formatAdmin(createdAdmin);

  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    session: { userId: admin.user.id },
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
  try {
    await prisma.admin.delete({
      where: {
        id: admin.id,
      },
    });
  } catch (error) {
    /* empty */
  }
});

describe('Company API', () => {
  it('should return a list of companies when method is GET', async () => {
    req.method = 'GET';

    await handler(req, res);

    const expectedCompany = expect.objectContaining({
      id: expect.any(Number),
      code: expect.any(String),
      name: expect.any(String),
      regional: expect.any(String),
    });
    const expectedRole = expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      permissions: expect.any(Array),
    });
    const expectedCompanyRole = {
      company: expectedCompany,
      role: expectedRole,
    };
    const expectedCompanyRoleList = expect.arrayContaining([expectedCompanyRole]);
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedCompanyRoleList,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should create a new company when method is POST and valid data is provided', async () => {
    req.method = 'POST';
    req.body = {
      code: 'TST_createCompany6',
      name: 'Company Name',
      regional: 'Regional Name',
    };

    await handler(req, res);
    const expectedCompany = expect.objectContaining({
      id: expect.any(Number),
      code: expect.any(String),
      name: expect.any(String),
      regional: expect.any(String),
    });
    const expectedRole = expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      permissions: expect.any(Array),
    });
    const expectedCompanyRole = {
      company: expectedCompany,
      role: expectedRole,
    };
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('201'),
      message: expect.any(String),
      payload: expectedCompanyRole,
    });
    await prisma.admin.deleteMany({
      where: {
        companyId: res.json.mock.calls[0][0].payload.company.id,
      },
    });
    await prisma.company.delete({
      where: {
        code: 'TST_createCompany6',
      },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return an error when method is POST and invalid data is provided', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.body = {
      // missing required fields
    };

    await handler(req, res);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return an error when method is not allowed', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';

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

  it('should return an error when session is UNAUTHORIZED', async () => {
    req = {
      headers: {},
      body: null,
      query: {},
      method: 'GET',
      session: {},
      json: jest.fn(),
    } as unknown as jest.Mocked<NextApiRequest>;

    await handler(req, res);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('401'),
      message: expect.any(String),
      payload: expect.any(Object),
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });
});

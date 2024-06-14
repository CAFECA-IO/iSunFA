import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/[companyId]/admin/index';
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
            credentialId: 'admin_test1',
          },
          create: {
            name: 'John admin',
            credentialId: 'admin_test1',
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
            name: 'admin_test1',
          },
          create: {
            name: 'admin_test1',
            permissions: ['hihi', 'ooo'],
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      company: {
        connectOrCreate: {
          where: {
            code: 'admin_test1',
          },
          create: {
            code: 'admin_test1',
            name: 'Test Company',
            regional: 'TW',
            kycStatus: false,
            imageId: 'imageId',
            startDate: 0,
            createdAt: 0,
            updatedAt: 0,
          },
        },
      },
      email: 'admin_test1@test',
      status: true,
      startDate: 0,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      company: true,
      user: true,
      role: true,
    },
  });
  admin = await formatAdmin(createdAdmin);
  req = {
    headers: {},
    query: {},
    method: '',
    json: jest.fn(),
    body: {},
    session: { userId: admin.user.id, companyId: admin.company.id },
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
    await prisma.company.delete({
      where: {
        id: admin.company.id,
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
    await prisma.role.delete({
      where: {
        id: admin.role.id,
      },
    });
  } catch (error) {
    /* empty */
  }
});

describe('API Handler Tests', () => {
  it('should return admin list when GET method is used', async () => {
    req.method = 'GET';
    req.query = {};

    await handler(req, res);
    const expectedAdmin = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      userId: expect.any(Number),
      roleId: expect.any(Number),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
      user: expect.any(Object),
      company: expect.any(Object),
      role: expect.any(Object),
    });
    const expectedAdminList = expect.arrayContaining([expectedAdmin]);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedAdminList,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return error when non-GET method is used', async () => {
    req.method = 'POST';
    req.query = {};

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
  it('should return error when session is invalid', async () => {
    req = {
      headers: {},
      query: {},
      method: '',
      json: jest.fn(),
      body: {},
      session: {},
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

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { IAdmin } from '@/interfaces/admin';
import { ROLE_NAME } from '@/constants/role_name';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let admin: IAdmin;

beforeEach(async () => {
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  admin = (await prisma.admin.findFirst({
    where: {
      user: {
        credentialId: 'john_tst',
      },
      company: {
        code: 'TST_user2',
      },
      role: {
        name: 'SUPER_ADMIN',
      },
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  })) as IAdmin;
  if (!admin) {
    admin = await prisma.admin.create({
      data: {
        user: {
          connectOrCreate: {
            where: {
              credentialId: 'john_tst',
            },
            create: {
              name: 'John user',
              credentialId: 'john_tst',
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
              name: ROLE_NAME.SUPER_ADMIN,
            },
            create: {
              name: ROLE_NAME.SUPER_ADMIN,
              permissions: ['hihi', 'ooo'],
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
            },
          },
        },
        company: {
          connectOrCreate: {
            where: {
              code: 'TST_user2',
            },
            create: {
              code: 'TST_user2',
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
        email: 'test@email',
        status: false,
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      include: {
        company: true,
        user: true,
        role: true,
      },
    });
  }
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    session: { userId: admin.user.id, companyId: admin.company.id },
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;
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

describe('test user API', () => {
  it('should list all users', async () => {
    await handler(req, res);
    const expectedUser = expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      credentialId: expect.any(String),
      publicKey: expect.any(String),
      algorithm: expect.any(String),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    const expectedUserList = expect.arrayContaining([expectedUser]);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedUserList,
    });
    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should create a new user', async () => {
    req.method = 'POST';
    req.body = {
      name: 'John',
      fullName: 'John Doe',
      email: 'john@mermer.cc',
      phone: '1234567890',
      credentialId: '1000456',
      publicKey: 'publicKey',
      algorithm: 'ES256',
      imageId: 'imageId',
    };
    await handler(req, res);
    await prisma.user.delete({
      where: {
        id: res.json.mock.calls[0][0].payload.id,
      },
    });

    const expectedUser = expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      credentialId: expect.any(String),
      publicKey: expect.any(String),
      algorithm: expect.any(String),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('201'),
      message: expect.any(String),
      payload: expectedUser,
    });
    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'PUT';
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
});

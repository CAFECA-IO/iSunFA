import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { IAdmin } from '@/interfaces/admin';
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
        credentialId: 'john_tst22',
      },
      company: {
        code: 'TST_user1',
      },
      role: {
        name: 'SUPER_ADMIN2',
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
              credentialId: 'john_tst22',
            },
            create: {
              name: 'John user',
              credentialId: 'john_tst22',
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
              name: 'SUPER_ADMIN',
            },
            create: {
              name: 'SUPER_ADMIN',
              permissions: ['hihi', 'ooo'],
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
            },
          },
        },
        company: {
          connectOrCreate: {
            where: {
              code: 'TST_user1',
            },
            create: {
              code: 'TST_user1',
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
        startDate: 0,
        email: 'john_tst22@test',
        status: true,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      include: {
        user: true,
        company: true,
        role: true,
      },
    });
  }

  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    session: { userId: admin.user.id },
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

describe('test user API by userid', () => {
  it('should retrieve user by userid', async () => {
    req.query.userId = admin.user.id.toString();
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

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedUser,
    });
    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should update user by userid', async () => {
    req.query.userId = admin.user.id.toString();
    req.method = 'PUT';
    req.body = {
      name: 'Jane',
      email: 'Jane@mermer.cc',
      fullName: 'Jane Doe',
      phone: '1234567890',
      imageId: 'imageId',
    };
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

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedUser,
    });
    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should delete user by userid', async () => {
    req.query.userId = admin.user.id.toString();
    req.method = 'DELETE';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
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
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedUser,
    });
    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle unsupported HTTP methods', async () => {
    req.query.userId = admin.user.id.toString();
    req.method = 'POST';
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

  it('should handle missing userid in headers', async () => {
    req.query.userId = '-1';
    await handler(req, res);
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('404'),
      message: expect.any(String),
      payload: expect.any(Object),
    });
    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle missing userid in query', async () => {
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

  it('should handle invalid userid', async () => {
    req.headers.userid = '-1';
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
});

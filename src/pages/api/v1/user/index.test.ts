import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let userCompanyRole: {
  userId: number;
  companyId: number;
  roleId: number;
  startDate: number;
};

beforeEach(async () => {
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  userCompanyRole = (await prisma.userCompanyRole.findFirst({
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
  })) as {
    userId: number;
    companyId: number;
    roleId: number;
    startDate: number;
  };
  if (!userCompanyRole) {
    userCompanyRole = await prisma.userCompanyRole.create({
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
              code: 'TST_user2',
            },
            create: {
              code: 'TST_user2',
              name: 'Test Company',
              regional: 'TW',
              startDate: nowTimestamp,
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
            },
          },
        },
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  }
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    session: { userId: userCompanyRole.userId },
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.userCompanyRole.delete({
      where: {
        userId_companyId_roleId: {
          userId: userCompanyRole.userId,
          companyId: userCompanyRole.companyId,
          roleId: userCompanyRole.roleId,
        },
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.user.delete({
      where: {
        id: userCompanyRole.userId,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.company.delete({
      where: {
        id: userCompanyRole.companyId,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.role.delete({
      where: {
        id: userCompanyRole.roleId,
      },
    });
  } catch (error) {
    /* empty */
  }
});

describe('test user API', () => {
  it('should list all users', async () => {
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
            name: expect.any(String),
            credentialId: expect.any(String),
            publicKey: expect.any(String),
            algorithm: expect.any(String),
          }),
        ]),
      })
    );
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
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('201'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          fullName: expect.any(String),
          email: expect.any(String),
          phone: expect.any(String),
          credentialId: expect.any(String),
          publicKey: expect.any(String),
          algorithm: expect.any(String),
        }),
      })
    );
  });

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'PUT';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('405'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });
});

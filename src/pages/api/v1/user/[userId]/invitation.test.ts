import { NextApiRequest, NextApiResponse } from 'next';
import { timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';
import handler from './invitation';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let companyId: number;
let invitationCode: string;
let roleId: number;
let userId: number;
beforeEach(async () => {
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;

  const getCompany = await prisma.company.findFirst({
    where: {
      code: 'TST',
    },
  });
  if (!getCompany) {
    const now = Date.now();
    const currentTimestamp = timestampInSeconds(now);
    await prisma.company.create({
      data: {
        code: 'TST',
        name: 'Test Company',
        regional: 'TW',
        startDate: currentTimestamp,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      },
    });
  }
  const invitation = await prisma.invitation.create({
    data: {
      code: 'test',
      hasUsed: false,
      expiredAt: timestampInSeconds(Date.now() + 86400),
      company: {
        connect: {
          code: 'TST',
        },
      },
      role: {
        create: {
          name: 'Test Role',
          company: {
            connect: {
              code: 'TST',
            },
          },
          permissions: ['READ', 'WRITE', 'DELETE'],
        },
      },
      createdUser: {
        connectOrCreate: {
          where: { credentialId: 'test' },
          create: {
            credentialId: 'test',
            email: '',
            name: '',
            publicKey: '',
            algorithm: '',
          },
        },
      },
    },
  });
  invitationCode = invitation.code;
  roleId = invitation.roleId;
  companyId = invitation.companyId;
  const user = await prisma.user.findFirstOrThrow({
    where: {
      credentialId: 'test',
    },
  });
  userId = user.id;
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    json: jest.fn(),
    session: { userId },
  } as unknown as jest.Mocked<NextApiRequest>;
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.company.delete({
      where: {
        id: companyId,
      },
    });
  } catch (error) {
    // Info: (20240517 - Jacky) If already deleted, ignore the error.
  }
  try {
    await prisma.invitation.delete({
      where: {
        code: invitationCode,
      },
    });
  } catch (error) {
    // Info: (20240517 - Jacky) If already deleted, ignore the error.
  }
  try {
    await prisma.role.delete({
      where: {
        id: roleId,
      },
    });
  } catch (error) {
    // Info: (20240517 - Jacky) If already deleted, ignore the error.
  }
});

describe('PUT Invitation API', () => {
  it('should return 200 and success message', async () => {
    req.method = 'PUT';
    req.body = {
      invitation: invitationCode,
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
          code: expect.any(String),
          name: expect.any(String),
          regional: expect.any(String),
        }),
      })
    );
  });
});

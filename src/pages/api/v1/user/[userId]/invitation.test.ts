import { NextApiRequest, NextApiResponse } from 'next';
import { timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';
import { ONE_DAY_IN_S } from '@/constants/time';
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
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const expireTimestamp = nowTimestamp + ONE_DAY_IN_S;
  const invitation = await prisma.invitation.create({
    data: {
      code: 'test1230',
      hasUsed: false,
      expiredAt: expireTimestamp,
      company: {
        connectOrCreate: {
          where: {
            code: 'TST_invitation1',
          },
          create: {
            code: 'TST_invitation1',
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
      role: {
        connectOrCreate: {
          where: {
            name: 'Test_invitaion',
          },
          create: {
            name: 'Test_invitaion',
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      createdUser: {
        connectOrCreate: {
          where: { credentialId: 'test_PUT_INVITATION' },
          create: {
            credentialId: 'test_PUT_INVITATION',
            email: 'test_PUT_INVITATION@test',
            name: '',
            publicKey: '',
            algorithm: '',
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      email: 'test_PUT_INVITATION@test',
      phone: '',
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
  invitationCode = invitation.code;
  roleId = invitation.roleId;
  companyId = invitation.companyId;
  userId = invitation.createdUserId;
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
    await prisma.invitation.delete({
      where: {
        code: invitationCode,
      },
    });
  } catch (error) {
    // Info: (20240517 - Jacky) If already deleted, ignore the error.
  }
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

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedAdmin,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should pass', async () => {
    expect(true).toBe(true);
  });
});

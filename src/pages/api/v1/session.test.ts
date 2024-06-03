import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/session';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let companyId: number;
let userId: number;

beforeEach(async () => {
  let user = await prisma.user.findFirst({
    where: {
      credentialId: 'seesiontest',
    },
  });
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'John',
        credentialId: 'seesiontest',
        publicKey: 'publicKey',
        algorithm: 'ES256',
        imageId: 'imageId',
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  }
  let company = await prisma.company.findFirst({
    where: {
      code: 'TST_session1',
    },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        code: 'TST_session1',
        name: 'Test Company',
        regional: 'TW',
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  }
  companyId = company.id;
  userId = user.id;
  req = {
    method: 'GET',
    session: { userId, companyId },
  } as unknown as jest.Mocked<NextApiRequest>;
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Session API', () => {
  it('should return session data when method is GET', async () => {
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          user: expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            credentialId: expect.any(String),
            publicKey: expect.any(String),
            algorithm: expect.any(String),
          }),
          company: expect.objectContaining({
            id: expect.any(Number),
            code: expect.any(String),
            name: expect.any(String),
            regional: expect.any(String),
          }),
        }),
      })
    );
  });

  it('should return an error when method is not allowed', async () => {
    req.method = 'POST';

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

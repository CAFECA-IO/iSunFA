import { NextApiRequest, NextApiResponse } from 'next';
import { ISubscription } from '@/interfaces/subscription';
import { timestampInSeconds } from '@/lib/utils/common';
import { SubscriptionPeriod } from '@/constants/subscription';
import prisma from '@/client';
import { ONE_MONTH_IN_MS } from '@/constants/time';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let subscription: ISubscription;
let userCompanyRole: {
  userId: number;
  companyId: number;
  roleId: number;
  startDate: number;
};
let cardId: number;

beforeEach(async () => {
  userCompanyRole = (await prisma.userCompanyRole.findFirst({
    where: {
      user: {
        credentialId: 'subscription_index2_test',
      },
    },
  })) as { userId: number; companyId: number; roleId: number; startDate: number };
  if (!userCompanyRole) {
    userCompanyRole = await prisma.userCompanyRole.create({
      data: {
        user: {
          connectOrCreate: {
            where: {
              credentialId: 'subscription_index2_test',
            },
            create: {
              name: 'John',
              credentialId: 'subscription_index2_test',
              publicKey: 'publicKey',
              algorithm: 'ES256',
              imageId: 'imageId',
            },
          },
        },
        role: {
          connectOrCreate: {
            where: {
              name: 'subscription_ADMIN2',
            },
            create: {
              name: 'subscription_ADMIN2',
              permissions: ['hihi', 'ooo'],
            },
          },
        },
        company: {
          connectOrCreate: {
            where: {
              code: 'TST_subscription_11',
            },
            create: {
              code: 'TST_subscription_11',
              name: 'Test Company',
              regional: 'TW',
              startDate: 0,
              createdAt: 0,
              updatedAt: 0,
            },
          },
        },
        startDate: 0,
      },
    });
  }
  const createdSubscription = await prisma.subscription.create({
    data: {
      company: {
        connect: {
          id: userCompanyRole.companyId,
        },
      },
      plan: 'pro',
      // TODO: (20240530 - Jacky) Add cardId to the test data.
      cardId: 1,
      price: '100',
      autoRenew: true,
      startDate: timestampInSeconds(Date.now()),
      expireDate: timestampInSeconds(Date.now() + ONE_MONTH_IN_MS),
      status: 'active',
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
  });
  cardId = createdSubscription.cardId;
  subscription = {
    ...createdSubscription,
    companyName: createdSubscription.company.name,
  };
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    json: jest.fn(),
    session: { userId: userCompanyRole.userId, companyId: userCompanyRole.companyId },
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.subscription.delete({
      where: {
        id: subscription.id,
      },
    });
  } catch (error) {
    // Info: (20240515 - Jacky) If already deleted, ignore the error.
  }
  try {
    await prisma.company.delete({
      where: {
        id: userCompanyRole.companyId,
      },
    });
  } catch (error) {
    // Info: (20240517 - Jacky) If already deleted, ignore the error.
  }
});

describe('test subscription API', () => {
  it('should list all subscriptions', async () => {
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
            companyId: expect.any(Number),
            companyName: expect.any(String),
            plan: expect.any(String),
            cardId: expect.any(Number),
            price: expect.any(String),
            autoRenew: expect.any(Boolean),
            startDate: expect.any(Number),
            expireDate: expect.any(Number),
            status: expect.any(String),
          }),
        ]),
      })
    );
  });

  it('should create a new subscription', async () => {
    req.method = 'POST';
    req.body = {
      plan: 'pro',
      autoRenew: true,
      cardId,
      price: '100',
      period: SubscriptionPeriod.MONTHLY,
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    await prisma.subscription.delete({
      where: {
        id: res.json.mock.calls[0][0].payload.id,
      },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('201'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          companyId: expect.any(Number),
          companyName: expect.any(String),
          plan: expect.any(String),
          cardId: expect.any(Number),
          price: expect.any(String),
          autoRenew: expect.any(Boolean),
          expireDate: expect.any(Number),
          status: expect.any(String),
        }),
      })
    );
  });

  it('should handle unsupported HTTP methods', async () => {
    req.headers.userid = '1';
    req.method = 'PUT';
    req.query.companyId = userCompanyRole.companyId.toString();
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
  it('should handle unauthorized access', async () => {
    req = {
      headers: {},
      body: null,
      method: 'GET',
      json: jest.fn(),
      session: {},
    } as unknown as jest.Mocked<NextApiRequest>;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('401'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });
});

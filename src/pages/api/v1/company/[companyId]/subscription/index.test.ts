import { NextApiRequest, NextApiResponse } from 'next';
import { ISubscription } from '@/interfaces/subscription';
import { timestampInSeconds } from '@/lib/utils/common';
import { SUBSCRIPTION_PLAN, SubscriptionPeriod } from '@/constants/subscription';
import prisma from '@/client';
import { ONE_MONTH_IN_S } from '@/constants/time';
import { IAdmin } from '@/interfaces/admin';
import { IPlan } from '@/interfaces/plan';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let subscription: ISubscription;
let admin: IAdmin;
let plan: IPlan;

beforeEach(async () => {
  admin = (await prisma.admin.findFirst({
    where: {
      user: {
        credentialId: 'subscription_index2_test',
      },
    },
    include: {
      company: true,
      user: true,
      role: true,
    },
  })) as IAdmin;
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  if (!admin) {
    admin = await prisma.admin.create({
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
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
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
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
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
              kycStatus: false,
              imageId: 'imageId',
              startDate: 0,
              createdAt: 0,
              updatedAt: 0,
            },
          },
        },
        email: 'TST_subscription_11@test',
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
  }
  subscription = await prisma.subscription.create({
    data: {
      company: {
        connect: {
          id: admin.companyId,
        },
      },
      plan: {
        connectOrCreate: {
          where: {
            name: SUBSCRIPTION_PLAN.PRO,
          },
          create: {
            name: SUBSCRIPTION_PLAN.PRO,
            monthlyFee: 100,
            annualFee: 1000,
            description: 'pro plan',
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      // TODO: (20240530 - Jacky) Add cardId to the test data.
      startDate: nowTimestamp,
      expiredDate: nowTimestamp + ONE_MONTH_IN_S,
      status: true,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
  });
  plan = (await prisma.plan.findUnique({
    where: {
      name: 'test2',
    },
  })) as IPlan;
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        name: 'test2',
        monthlyFee: 100,
        annualFee: 1000,
        description: 'test plan',
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
    json: jest.fn(),
    session: { userId: admin.userId, companyId: admin.companyId },
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
    await prisma.admin.delete({
      where: {
        id: admin.id,
      },
    });
  } catch (error) {
    // Info: (20240517 - Jacky) If already deleted, ignore the error.
  }
  try {
    await prisma.company.delete({
      where: {
        id: admin.companyId,
      },
    });
  } catch (error) {
    // Info: (20240517 - Jacky) If already deleted, ignore the error.
  }
  try {
    await prisma.plan.delete({
      where: {
        id: plan.id,
      },
    });
  } catch (error) {
    // Info: (20240517 - Jacky) If already deleted, ignore the error.
  }
});

describe('test subscription API', () => {
  it('should list all subscriptions', async () => {
    await handler(req, res);
    // 定義 `expectedSubscription` 結構
    const expectedSubscription = {
      id: expect.any(Number),
      companyId: expect.any(Number),
      planId: expect.any(Number),
      startDate: expect.any(Number),
      expiredDate: expect.any(Number),
      status: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: expect.any(Boolean),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expect.stringContaining('200'),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.any(Array),
      })
    );
    // 獨立檢查 `payload` 中每個對象的每個字段
    (Object.keys(expectedSubscription) as Array<keyof typeof expectedSubscription>).forEach(
      (key) => {
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.arrayContaining([
              expect.objectContaining({ [key]: expectedSubscription[key] }),
            ]),
          })
        );
      }
    );
  });

  it('should create a new subscription', async () => {
    req.method = 'POST';
    req.body = {
      plan: plan.name,
      period: SubscriptionPeriod.MONTHLY,
    };
    await handler(req, res);
    const expectedSubscription = {
      id: expect.any(Number),
      companyId: expect.any(Number),
      planId: expect.any(Number),
      startDate: expect.any(Number),
      expiredDate: expect.any(Number),
      status: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    };
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: expect.any(Boolean),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expect.stringContaining('201'),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.any(Object),
      })
    );
    // 獨立檢查 `payload` 中每個對象的每個字段
    (Object.keys(expectedSubscription) as Array<keyof typeof expectedSubscription>).forEach(
      (key) => {
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({ [key]: expectedSubscription[key] }),
          })
        );
      }
    );
  });

  it('should handle unsupported HTTP methods', async () => {
    req.headers.userid = '1';
    req.method = 'PUT';
    req.query.companyId = admin.companyId.toString();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: expect.any(Boolean),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expect.stringContaining('405'),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
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
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: expect.any(Boolean),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expect.stringContaining('401'),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.any(Object),
      })
    );
  });
});

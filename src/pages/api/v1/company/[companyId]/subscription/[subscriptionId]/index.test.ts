import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { ISubscription } from '@/interfaces/subscription';
import { ONE_MONTH_IN_S } from '@/constants/time';
import { SUBSCRIPTION_PLAN } from '@/constants/subscription';
import { IPlan } from '@/interfaces/plan';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let subscription: ISubscription;
let plan: IPlan;

beforeEach(async () => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    json: jest.fn(),
    session: { userId: '1' },
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;

  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  subscription = await prisma.subscription.create({
    data: {
      company: {
        connectOrCreate: {
          where: {
            code: 'TST_subscription1',
          },
          create: {
            code: 'TST_subscription1',
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
      // TODO: (20240530 - Jacky) Add cardId to the from third party
      startDate: nowTimestamp,
      expiredDate: nowTimestamp + ONE_MONTH_IN_S,
      status: false,
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
  plan = await prisma.plan.create({
    data: {
      name: 'test1',
      monthlyFee: 100,
      annualFee: 1000,
      description: 'test plan',
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
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
        id: subscription.companyId,
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

describe('test subscription API by id', () => {
  it('should get subscription by id', async () => {
    req.method = 'GET';
    req.headers.userid = '1';
    req.query = {
      companyId: subscription.companyId.toString(),
      subscriptionId: subscription.id.toString(),
    };
    await handler(req, res);
    const expectedSubscription = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      planId: expect.any(Number),
      startDate: expect.any(Number),
      expiredDate: expect.any(Number),
      status: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedSubscription,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should update subscription', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
    req.query = {
      companyId: subscription.companyId.toString(),
      subscriptionId: subscription.id.toString(),
    };
    req.body = {
      plan: 'test1',
    };
    await handler(req, res);
    const expectedSubscription = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      planId: expect.any(Number),
      startDate: expect.any(Number),
      expiredDate: expect.any(Number),
      status: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedSubscription,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should delete subscription', async () => {
    req.method = 'DELETE';
    req.headers.userid = '1';
    req.query = {
      companyId: subscription.companyId.toString(),
      subscriptionId: subscription.id.toString(),
    };
    await handler(req, res);
    const expectedSubscription = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      planId: expect.any(Number),
      startDate: expect.any(Number),
      expiredDate: expect.any(Number),
      status: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedSubscription,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle INVALID_INPUT_PARAMETER', async () => {
    req.method = 'GET';
    req.headers.userid = 'user-id';
    req.query = {
      subscriptionId: subscription.id.toString(),
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

  it('should handle RESOURCE_NOT_FOUND', async () => {
    req.method = 'GET';
    req.headers.userid = 'user-id';
    req.query = {
      companyId: '1',
      subscriptionId: '00',
    };
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

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'POST';
    req.headers.userid = 'user-id';
    req.query = {
      companyId: '1',
      subscriptionId: subscription.id.toString(),
    };
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

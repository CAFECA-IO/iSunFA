import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { ISubscription } from '@/interfaces/subscription';
import { ONE_MONTH_IN_S } from '@/constants/time';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let subscription: ISubscription;
let companyId: number;
let cardId: number;

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

  let company = await prisma.company.findFirst({
    where: {
      code: 'TST_subscription1',
    },
  });
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  if (!company) {
    company = await prisma.company.create({
      data: {
        code: 'TST_subscription1',
        name: 'Test Company',
        regional: 'TW',
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  }
  companyId = company.id;
  const createdSubscription = await prisma.subscription.create({
    data: {
      company: {
        connect: {
          id: company.id,
        },
      },
      plan: 'pro',
      // TODO: (20240530 - Jacky) Add cardId to the from third party
      cardId: 1,
      price: '100',
      autoRenew: true,
      startDate: nowTimestamp,
      expiredDate: nowTimestamp + ONE_MONTH_IN_S,
      status: 'active',
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
  companyId = createdSubscription.companyId;
  cardId = createdSubscription.cardId;
  subscription = {
    ...createdSubscription,
    companyName: createdSubscription.company.name,
  };
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
        id: companyId,
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
      companyId: companyId.toString(),
      subscriptionId: subscription.id.toString(),
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
          companyId: expect.any(Number),
          companyName: expect.any(String),
          plan: expect.any(String),
          cardId: expect.any(Number),
          price: expect.any(String),
          autoRenew: expect.any(Boolean),
          expiredDate: expect.any(Number),
          status: expect.any(String),
        }),
      })
    );
  });

  it('should update subscription', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
    req.query = {
      companyId: companyId.toString(),
      subscriptionId: subscription.id.toString(),
    };
    req.body = {
      plan: 'basic',
      cardId,
      autoRenew: false,
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
          companyId: expect.any(Number),
          companyName: expect.any(String),
          plan: expect.any(String),
          cardId: expect.any(Number),
          price: expect.any(String),
          autoRenew: expect.any(Boolean),
          expiredDate: expect.any(Number),
          status: expect.any(String),
        }),
      })
    );
  });

  it('should delete subscription', async () => {
    req.method = 'DELETE';
    req.headers.userid = '1';
    req.query = {
      companyId: companyId.toString(),
      subscriptionId: subscription.id.toString(),
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
          companyId: expect.any(Number),
          companyName: expect.any(String),
          plan: expect.any(String),
          cardId: expect.any(Number),
          price: expect.any(String),
          autoRenew: expect.any(Boolean),
          expiredDate: expect.any(Number),
          status: expect.any(String),
        }),
      })
    );
  });

  it('should handle INVALID_INPUT_PARAMETER', async () => {
    req.method = 'GET';
    req.headers.userid = 'user-id';
    req.query = {
      subscriptionId: subscription.id.toString(),
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('422'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should handle RESOURCE_NOT_FOUND', async () => {
    req.method = 'GET';
    req.headers.userid = 'user-id';
    req.query = {
      companyId: '1',
      subscriptionId: '00',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('404'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'POST';
    req.headers.userid = 'user-id';
    req.query = {
      companyId: '1',
      subscriptionId: subscription.id.toString(),
    };
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

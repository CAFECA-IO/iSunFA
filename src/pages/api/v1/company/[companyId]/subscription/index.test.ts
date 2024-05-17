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

beforeEach(async () => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;

  const createdSubscription = await prisma.subscription.create({
    data: {
      company: {
        connectOrCreate: {
          where: {
            id: 3,
          },
          create: {
            name: 'Test Company',
            code: 'TST',
            regional: 'TW',
          },
        },
      },
      plan: 'pro',
      card: {
        connectOrCreate: {
          where: {
            id: 3,
          },
          create: {
            no: '1234567890',
            type: 'VISA22',
            expireYear: '23',
            expireMonth: '12',
            cvc: '123',
            name: 'Test Card',
          },
        },
      },
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
});

describe('test subscription API', () => {
  it('should list all subscriptions', async () => {
    req.headers.userid = '1';
    req.query.companyId = '3';
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
    req.headers.userid = '1';
    req.method = 'POST';
    req.query.companyId = '3';
    req.body = {
      plan: 'pro',
      autoRenew: true,
      cardId: 3,
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
    req.query.companyId = '1';
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

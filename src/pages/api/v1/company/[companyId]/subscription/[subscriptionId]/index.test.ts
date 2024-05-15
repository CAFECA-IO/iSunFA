import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { ISubscription } from '@/interfaces/subscription';
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
            id: 1,
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
            id: 1,
          },
          create: {
            no: '1234567890',
            type: 'VISA',
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

describe('test subscription API by id', () => {
  it('should get subscription by id', async () => {
    req.method = 'GET';
    req.headers.userid = '1';
    req.query = {
      companyId: '1',
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
          expireDate: expect.any(Number),
          status: expect.any(String),
        }),
      })
    );
  });

  it('should update subscription', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
    req.query = {
      companyId: '1',
      subscriptionId: subscription.id.toString(),
    };
    req.body = {
      plan: 'basic',
      // cardId: 119,
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
          expireDate: expect.any(Number),
          status: expect.any(String),
        }),
      })
    );
  });

  it('should delete subscription', async () => {
    req.method = 'DELETE';
    req.headers.userid = '1';
    req.query = {
      companyId: '1',
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
          expireDate: expect.any(Number),
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

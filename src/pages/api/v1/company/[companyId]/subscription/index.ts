import { NextApiRequest, NextApiResponse } from 'next';
import { ISubscription } from '@/interfaces/subscription';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/../prisma/client';
import { SubscriptionPeriod, SubscriptionStatus } from '@/constants/subscription';
import { ONE_MONTH_IN_MS, ONE_YEAR_IN_MS } from '@/constants/time';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISubscription | ISubscription[]>>
) {
  try {
    if (!req.query.companyId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    const companyIdNum = Number(req.query.companyId);
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    // Info: (20240419 - Jacky) S010001 - GET /subscription
    if (req.method === 'GET') {
      const listedSubscription = await prisma.subscription.findMany({
        where: {
          companyId: companyIdNum,
        },
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
      });
      const subscriptionList: ISubscription[] = listedSubscription.map((subscription) => ({
        ...subscription,
        companyName: subscription.company.name,
        company: null,
      }));
      const { httpCode, result } = formatApiResponse<ISubscription[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        subscriptionList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010002 - POST /subscription
    } else if (req.method === 'POST') {
      const { plan, cardId, autoRenew, price, period } = req.body;
      if (!plan || !cardId || !autoRenew || !companyIdNum || !price || !period) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const cardIdNum = Number(cardId);
      const startDateInMillisecond = Date.now();
      let expireDateInMillisecond: number;
      if (period === SubscriptionPeriod.MONTHLY) {
        expireDateInMillisecond = startDateInMillisecond + ONE_MONTH_IN_MS;
      } else if (period === SubscriptionPeriod.YEARLY) {
        expireDateInMillisecond = startDateInMillisecond + ONE_YEAR_IN_MS;
      } else {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const startDate = timestampInSeconds(startDateInMillisecond);
      const expireDate = timestampInSeconds(expireDateInMillisecond);
      const status = SubscriptionStatus.ACTIVE;
      if (!companyIdNum) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const createdSubscription = await prisma.subscription.create({
        data: {
          plan,
          card: {
            // Should be changed to connect
            connectOrCreate: {
              where: {
                id: cardIdNum,
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
          autoRenew,
          company: {
            connect: {
              id: companyIdNum,
            },
          },
          startDate,
          expireDate,
          price,
          status,
        },
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
      });
      const subscription: ISubscription = {
        ...createdSubscription,
        companyName: createdSubscription.company.name,
      };
      const { httpCode, result } = formatApiResponse<ISubscription>(
        STATUS_MESSAGE.CREATED,
        subscription
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ISubscription>(
      error.message,
      {} as ISubscription
    );
    res.status(httpCode).json(result);
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { ISubscription } from '@/interfaces/subscription';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';
import { SubscriptionPeriod, SubscriptionStatus } from '@/constants/subscription';
import { ONE_MONTH_IN_S, ONE_YEAR_IN_S } from '@/constants/time';
import { checkCompanySession } from '@/lib/utils/session_check';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISubscription | ISubscription[]>>
) {
  try {
    const session = await checkCompanySession(req, res);
    const { companyId } = session;
    // Info: (20240419 - Jacky) S010001 - GET /subscription
    if (req.method === 'GET') {
      const listedSubscription = await prisma.subscription.findMany({
        where: {
          companyId,
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
      if (!plan || !autoRenew || !price || !period) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const cardIdNum = Number(cardId);
      const now = Date.now();
      const startDate = timestampInSeconds(now);
      let expiredDate: number;
      if (period === SubscriptionPeriod.MONTHLY) {
        expiredDate = startDate + ONE_MONTH_IN_S;
      } else if (period === SubscriptionPeriod.YEARLY) {
        expiredDate = startDate + ONE_YEAR_IN_S;
      } else {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const status = SubscriptionStatus.ACTIVE;
      const createdSubscription = await prisma.subscription.create({
        data: {
          plan,
          cardId: cardIdNum,
          autoRenew,
          company: {
            connect: {
              id: companyId,
            },
          },
          startDate,
          expiredDate,
          price,
          status,
          createdAt: startDate,
          updatedAt: startDate,
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

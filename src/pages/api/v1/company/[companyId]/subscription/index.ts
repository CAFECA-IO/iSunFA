import { NextApiRequest, NextApiResponse } from 'next';
import { ISubscription } from '@/interfaces/subscription';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';
import { SubscriptionPeriod } from '@/constants/subscription';
import { ONE_MONTH_IN_S, ONE_YEAR_IN_S } from '@/constants/time';
import { checkAdminSession } from '@/lib/utils/session_check';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISubscription | ISubscription[]>>
) {
  try {
    const session = await checkAdminSession(req, res);
    const { companyId } = session;
    // Info: (20240419 - Jacky) S010001 - GET /subscription
    if (req.method === 'GET') {
      const subscriptionList: ISubscription[] = await prisma.subscription.findMany({
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
      const { httpCode, result } = formatApiResponse<ISubscription[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        subscriptionList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010002 - POST /subscription
    } else if (req.method === 'POST') {
      const { plan, period } = req.body;
      if (!plan || !period) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      // TODO: (20240604 - Jacky) Check if the company already has a subscription
      // TODO: (20240604 - Jacky) Check if the plan is valid
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
      const status = false;
      const subscription: ISubscription = await prisma.subscription.create({
        data: {
          plan: {
            connect: {
              name: plan,
            },
          },
          company: {
            connect: {
              id: companyId,
            },
          },
          startDate,
          expiredDate,
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

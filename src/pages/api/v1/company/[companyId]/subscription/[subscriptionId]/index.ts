import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ISubscription } from '@/interfaces/subscription';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISubscription>>
) {
  const { method } = req;
  const { companyId, subscriptionId } = req.query;

  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (!companyId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    if (!subscriptionId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    const subscriptionIdNum = Number(subscriptionId);
    const companyIdNum = Number(companyId);
    if (method === 'GET') {
      const subscription: ISubscription = (await prisma.subscription.findUnique({
        where: {
          id: subscriptionIdNum,
        },
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
      })) as ISubscription;
      if (!subscription) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const { httpCode, result } = formatApiResponse<ISubscription>(
        STATUS_MESSAGE.SUCCESS_GET,
        subscription
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010003 - PUT /subscription/:id
    } else if (method === 'PUT') {
      const { plan, period } = req.body;
      if (!plan && !companyIdNum && !period) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const subscription: ISubscription = await prisma.subscription.update({
        where: {
          id: subscriptionIdNum,
        },
        data: {
          plan: {
            connect: {
              name: plan,
            },
          },
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
        STATUS_MESSAGE.SUCCESS_UPDATE,
        subscription
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010004 - DELETE /subscription/:id
    } else if (method === 'DELETE') {
      const subscription: ISubscription = await prisma.subscription.delete({
        where: {
          id: subscriptionIdNum,
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
        STATUS_MESSAGE.SUCCESS_DELETE,
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

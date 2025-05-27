import prisma from '@/client';
import { SortOrder } from '@/constants/sort';
import { SubscriptionPeriod } from '@/constants/subscription';
import { ONE_DAY_IN_S } from '@/constants/time';
import { ISubscription } from '@/interfaces/subscription';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Prisma } from '@prisma/client';

// Info: (20240620 - Jacky) Create
export async function createSubscription(
  accountBookId: number,
  planId: number,
  status: boolean,
  subscriptionPeriod: SubscriptionPeriod
): Promise<ISubscription> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const expiredDate = nowTimestamp + subscriptionPeriod * ONE_DAY_IN_S;
  const newSubscription = await prisma.subscription.create({
    data: {
      accountBookId,
      planId,
      autoRenewal: true,
      startDate: nowTimestamp,
      expiredDate,
      status,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
  return newSubscription;
}

// Info: (20240620 - Jacky) Read
export async function getSubscriptionById(id: number): Promise<ISubscription | null> {
  const subscription = await prisma.subscription.findUnique({
    where: {
      id,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });
  return subscription;
}

// Info: (20240620 - Jacky) Update
export async function updateSubscription(
  id: number,
  subscription: Partial<ISubscription>
): Promise<ISubscription | null> {
  const updatedSubscription = await prisma.subscription.update({
    where: {
      id,
    },
    data: subscription,
  });
  return updatedSubscription;
}

// Info: (20240620 - Jacky) Delete
export async function deleteSubscription(id: number): Promise<ISubscription> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.SubscriptionWhereUniqueInput = {
    id,
    deletedAt: null,
  };

  const data: Prisma.SubscriptionUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const updateArgs: Prisma.SubscriptionUpdateArgs = {
    where,
    data,
  };

  const deletedSubscription = await prisma.subscription.update(updateArgs);
  return deletedSubscription;
}

// Info: (20240620 - Jacky) List
export async function listSubscriptions(accountBookId: number): Promise<ISubscription[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      accountBookId,
    },
    orderBy: {
      id: SortOrder.ASC,
    },
  });
  return subscriptions;
}

// Info: (20240723 - Murky) Real delete for testing
export async function deleteSubscriptionForTesting(id: number): Promise<ISubscription> {
  const where: Prisma.SubscriptionWhereUniqueInput = {
    id,
  };

  const deletedSubscription = await prisma.subscription.delete({
    where,
  });

  return deletedSubscription;
}

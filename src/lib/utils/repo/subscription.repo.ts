import prisma from '@/client';
import { SubscriptionPeriod } from '@/constants/subscription';
import { ONE_DAY_IN_S } from '@/constants/time';
import { ISubscription } from '@/interfaces/subscription';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Prisma } from '@prisma/client';

// Create
export async function createSubscription(
  companyId: number,
  planId: number,
  status: boolean,
  subscriptionPeriod: SubscriptionPeriod
): Promise<ISubscription> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const expiredDate = nowTimestamp + subscriptionPeriod * ONE_DAY_IN_S;
  const newSubscription = await prisma.subscription.create({
    data: {
      companyId,
      planId,
      startDate: nowTimestamp,
      expiredDate,
      status,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
  return newSubscription;
}

// Read
export async function getSubscriptionById(id: number): Promise<ISubscription | null> {
  const subscription = await prisma.subscription.findUnique({
    where: {
      id,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });
  return subscription;
}

// Update
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

// Delete
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

// List
export async function listSubscriptions(companyId: number): Promise<ISubscription[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      companyId,
    },
    orderBy: {
      id: 'asc',
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

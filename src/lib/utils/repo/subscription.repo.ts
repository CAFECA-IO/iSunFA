import prisma from '@/client';
import { ONE_DAY_IN_S } from '@/constants/time';
import { ISubscription } from '@/interfaces/subscription';
import { timestampInSeconds } from '@/lib/utils/common';

// Create
export async function createSubscription(
  companyId: number,
  planId: number,
  status: boolean
): Promise<ISubscription> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  // TODO (20240617 - Jacky): Need to get plan details to calculate expired date
  const expiredDate = nowTimestamp + 30 * ONE_DAY_IN_S;
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
  const deletedSubscription = await prisma.subscription.delete({
    where: {
      id,
    },
  });
  return deletedSubscription;
}

// List
export async function listSubscriptions(companyId: number): Promise<ISubscription[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      companyId,
    },
  });
  return subscriptions;
}

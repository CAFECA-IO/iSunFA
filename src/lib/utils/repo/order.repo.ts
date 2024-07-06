import prisma from '@/client';
import { IOrder } from '@/interfaces/order';
import { timestampInSeconds } from '@/lib/utils/common';

export async function listOrder(companyId: number): Promise<IOrder[]> {
  const listedOrder = await prisma.order.findMany({
    where: {
      companyId,
    },
    orderBy: {
      id: 'asc',
    },
  });
  return listedOrder;
}

export async function createOrder(
  companyId: number,
  planId: number,
  status: string
): Promise<IOrder> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newOrder = await prisma.order.create({
    data: {
      companyId,
      planId,
      status,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
  return newOrder;
}

// Read
export async function getOrderById(id: number): Promise<IOrder | null> {
  let order = null;
  if (id > 0) {
    order = await prisma.order.findUnique({
      where: {
        id,
      },
    });
  }

  return order;
}

// Update
export async function updateOrder(id: number, status: string): Promise<IOrder> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const order = await prisma.order.update({
    where: {
      id,
    },
    data: {
      status,
      updatedAt: nowTimestamp,
    },
  });
  return order;
}

export async function deleteOrder(id: number): Promise<IOrder> {
  const deletedOrder = await prisma.order.delete({
    where: {
      id,
    },
  });
  return deletedOrder;
}

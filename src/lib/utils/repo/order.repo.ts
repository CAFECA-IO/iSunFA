import prisma from '@/client';
import { IOrder } from '@/interfaces/order';
import { timestampInSeconds } from '../common';

export async function listOrder(companyId: number): Promise<IOrder[]> {
  const listedOrder = await prisma.order.findMany({
    where: {
      companyId,
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
export async function getOrderById(id: number): Promise<IOrder> {
  let order = {} as IOrder;
  if (id > 0) {
    const getOrder = (await prisma.order.findUnique({
      where: {
        id,
      },
    })) as IOrder;
    order = getOrder;
  }

  return order;
}

// Update
export async function updateOrder(id: number, status: string): Promise<IOrder> {
  let order = {} as IOrder;
  if (id > 0) {
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    const updatedOrder = await prisma.order.update({
      where: {
        id,
      },
      data: {
        status,
        updatedAt: nowTimestamp,
      },
    });
    order = updatedOrder;
  }
  return order;
}

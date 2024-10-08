import prisma from '@/client';
import { SortOrder } from '@/constants/sort';
import { IOrder } from '@/interfaces/order';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Plan, Prisma } from '@prisma/client';

export async function listOrder(companyId: number): Promise<IOrder[]> {
  const listedOrder = await prisma.order.findMany({
    where: {
      companyId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      id: SortOrder.ASC,
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

// Info: (20240620 - Jacky) Read
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

export async function getOrderDetailById(id: number): Promise<(IOrder & { plan: Plan }) | null> {
  let order: (IOrder & { plan: Plan }) | null = null;
  if (id > 0) {
    order = await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        plan: true,
      },
    });
  }

  return order;
}

// Info: (20240620 - Jacky) Update
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
  const nowInSecond = getTimestampNow();
  const where: Prisma.OrderWhereUniqueInput = {
    id,
    deletedAt: null,
  };

  const data: Prisma.OrderUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const updateArgs: Prisma.OrderUpdateArgs = {
    where,
    data,
  };

  const deletedOrder = await prisma.order.update(updateArgs);
  return deletedOrder;
}

// Info: (20240723 - Murky) Real delete for testing
export async function deleteOrderForTesting(id: number): Promise<IOrder> {
  const where: Prisma.OrderWhereUniqueInput = {
    id,
  };

  const deletedOrder = await prisma.order.delete({
    where,
  });

  return deletedOrder;
}

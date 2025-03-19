import prisma from '@/client';
import { SortOrder } from '@/constants/sort';
import { IOrder, IOrderDetail } from '@/interfaces/order';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Plan, Prisma } from '@prisma/client';

export async function listOrder(companyId: number): Promise<IOrder[]> {
  const listedOrder = (await prisma.order.findMany({
    where: {
      companyId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      id: SortOrder.ASC,
    },
  })) as unknown as IOrder[];
  return listedOrder;
}

export async function createOrder(
  userId: number,
  companyId: number,
  planId: number,
  status: string,
  detail: IOrderDetail
): Promise<IOrder> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newOrder: IOrder = {
    userId,
    companyId,
    planId,
    status,
    detail,
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
  };
  const data: Prisma.OrderCreateInput = {
    planId: newOrder.planId,
    status: newOrder.status,
    detail: newOrder.detail,
    createdAt: newOrder.createdAt,
    updatedAt: newOrder.updatedAt,
    company: {
      connect: {
        id: newOrder.companyId,
      },
    },
    user: {
      connect: {
        id: newOrder.userId,
      },
    },
  } as unknown as Prisma.OrderCreateInput;
  const createResult = await prisma.order.create({ data });
  return createResult as unknown as IOrder;
}

// Info: (20240620 - Jacky) Read
export async function getOrderById(id: number): Promise<IOrder | null> {
  let order = null;
  if (id > 0) {
    order = (await prisma.order.findUnique({
      where: {
        id,
      },
    })) as unknown as IOrder;
  }

  return order;
}

export async function getOrderDetailById(id: number): Promise<(IOrder & { plan: Plan }) | null> {
  let order: (IOrder & { plan: Plan }) | null = null;
  if (id > 0) {
    order = (await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        plan: true,
      },
    })) as unknown as IOrder & { plan: Plan };
  }

  return order;
}

// Info: (20240620 - Jacky) Update
export async function updateOrder(id: number, status: string): Promise<IOrder> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const order = (await prisma.order.update({
    where: {
      id,
    },
    data: {
      status,
      updatedAt: nowTimestamp,
    },
  })) as unknown as IOrder;
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

  const deletedOrder = (await prisma.order.update(updateArgs)) as unknown as IOrder;
  return deletedOrder;
}

// Info: (20240723 - Murky) Real delete for testing
export async function deleteOrderForTesting(id: number): Promise<IOrder> {
  const where: Prisma.OrderWhereUniqueInput = {
    id,
  };

  const deletedOrder = (await prisma.order.delete({
    where,
  })) as unknown as IOrder;

  return deletedOrder;
}

import prisma from '@/client';
import { SortOrder } from '@/constants/sort';
import { IOrder, IOrderDetail } from '@/interfaces/order';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Plan, Prisma } from '@prisma/client';
import { InputJsonValue } from '@prisma/client/runtime/library';

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
  detail: IOrderDetail[]
): Promise<IOrder> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const orderDetail = detail as unknown as InputJsonValue;
  const newOrder = (await prisma.order.create({
    data: {
      userId,
      companyId,
      planId,
      status,
      detail: orderDetail,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  })) as unknown as IOrder;
  return newOrder;
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

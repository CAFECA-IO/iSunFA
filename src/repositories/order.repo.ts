import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";
import {
  IOrderWithMission,
  IOrderUpdateTokensParams,
} from "@/interfaces/payment";
import { ORDER_TYPE, ORDER_STATUS } from "@/constants/status";
import type { JSONValue } from "@/validators";

export class OrderRepository {
  async findFirst(args: Prisma.OrderFindFirstArgs) {
    return prisma.order.findFirst(args);
  }

  async findMany(args: Prisma.OrderFindManyArgs) {
    return prisma.order.findMany(args);
  }

  async update(args: Prisma.OrderUpdateArgs) {
    return prisma.order.update(args);
  }
  async countAllOrders(): Promise<number> {
    return prisma.order.count();
  }

  // Info: (20260511 - Julian) 用於 analysis.service 的方法
  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
    });
  }

  async updateOrderData(id: string, data: JSONValue) {
    return prisma.order.update({
      where: { id },
      data: { data: data as Prisma.InputJsonValue },
    });
  }

  async countCommissionOrders(): Promise<number> {
    return prisma.order.count({
      where: {
        amount: { lt: 0 },
      },
    });
  }

  async getAllOrdersPaginated(skip: number, limit: number) {
    return prisma.order.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        paymentTransactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  }

  async getAllCommissionOrdersPaginated(skip: number, limit: number) {
    return prisma.order.findMany({
      where: {
        amount: { lt: 0 },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        paymentTransactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  }

  async getOrdersMissingTokens(): Promise<IOrderWithMission[]> {
    const orders = await prisma.order.findMany({
      where: {
        type: ORDER_TYPE.ANALYSIS,
        status: ORDER_STATUS.COMPLETED,
        mission: { not: null },
        OR: [{ tokens: null }, { tokens: 0 }],
      },
      select: {
        id: true,
        mission: true,
        tokens: true,
      },
    });
    return orders;
  }

  async updateOrderTokens(params: IOrderUpdateTokensParams): Promise<void> {
    await prisma.order.update({
      where: { id: params.id },
      data: { tokens: params.tokens },
    });
  }
}

export const orderRepo = new OrderRepository();

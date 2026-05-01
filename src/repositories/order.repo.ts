import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

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
}

export const orderRepo = new OrderRepository();

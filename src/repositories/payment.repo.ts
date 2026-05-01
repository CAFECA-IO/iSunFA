import { prisma } from "@/lib/prisma";
import { Prisma, Order, User } from "@/generated/client";
import {
  ORDER_STATUS,
  PAYMENT_TRANSACTION_STATUS,
  ORDER_TYPE,
} from "@/constants/status";
import { IOenCallbackData, IOenOrderData } from "@/interfaces/payment";
import { buildReceiptDataToSave } from "@/lib/utils/payment_helpers";
import { CurrencyUnit, CURRENCY_UNIT } from "@/constants/price";

export interface IOrderWithUser extends Order {
  user: User | null;
}

export class PaymentRepository {
  async getOrderWithUser(orderId: string): Promise<IOrderWithUser | null> {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
  }

  async processOenPayment(
    order: IOrderWithUser,
    body: IOenCallbackData,
    status: string,
    token?: string,
  ) {
    let shouldMint = false;
    let creditsToMint = 0;
    let amountPaid = 0;

    await prisma.$transaction(async (tx) => {
      if (token && typeof token === "string") {
        const existingMethod = await tx.paymentMethod.findFirst({
          where: {
            userId: order.userId,
            provider: "OEN",
            token: token,
          },
        });

        if (!existingMethod) {
          const rawBody = body as IOenCallbackData;
          await tx.paymentMethod.create({
            data: {
              userId: order.userId,
              provider: "OEN",
              token: token,
              data: (Object.keys(rawBody).length > 0
                ? rawBody
                : Prisma.DbNull) as Prisma.InputJsonValue,
            },
          });
        }
      }

      const isPaymentSuccess =
        status === "SUCCESS" ||
        body.success === true ||
        (token && typeof token === "string");

      if (isPaymentSuccess && order.status === ORDER_STATUS.PENDING) {
        if (order.type === ORDER_TYPE.OEN_BINDING) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: ORDER_STATUS.COMPLETED,
              data: {
                ...(order.data as IOenOrderData),
              } as Prisma.InputJsonObject,
            },
          });
        } else if (order.type === ORDER_TYPE.OEN_PAYMENT) {
          const _creditsToMint = (order.data as IOenOrderData)?.credits || 0;
          const standardizedData = buildReceiptDataToSave(
            order.id,
            order.amount,
            (order.data as Record<string, unknown>) || {},
            body as Record<string, unknown>, // Info: (20260410 - Luphia) Use webhook body as pmData proxy for buyerName/taxId if submitted
            order.user,
          );

          const dbReceipt = await tx.receipt.create({
            data: {
              orderId: order.id,
              amount: order.amount,
              data: {
                ...body,
                ...standardizedData,
                randomCode: Math.floor(Math.random() * 9000 + 1000).toString(),
                receiptDetails: {
                  amount: order.amount,
                  credits: _creditsToMint,
                  transactionTime: new Date().toISOString(),
                  buyerId: order.userId,
                  buyerName: order.user?.name || "Unknown",
                  itemDescription: `iSunFA Credits - ${_creditsToMint}`,
                  gatewayTxId: (body as unknown as { data?: { id?: string } })
                    ?.data?.id,
                },
              } as Prisma.InputJsonObject,
            },
          });

          await tx.paymentTransaction.updateMany({
            where: { orderId: order.id },
            data: {
              status: PAYMENT_TRANSACTION_STATUS.SUCCESS,
              rawData: body as unknown as Prisma.InputJsonValue,
            },
          });

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: ORDER_STATUS.PAID,
              data: {
                ...(order.data as IOenOrderData),
                checkoutResponse: body as unknown as Prisma.InputJsonValue,
                receiptId: dbReceipt.id,
              } as Prisma.InputJsonObject,
            },
          });

          shouldMint = true;
          creditsToMint = _creditsToMint;
          amountPaid = order.amount;
        }
      } else if (!isPaymentSuccess && order.status === ORDER_STATUS.PENDING) {
        await tx.paymentTransaction.updateMany({
          where: { orderId: order.id },
          data: {
            status: PAYMENT_TRANSACTION_STATUS.FAILED,
            rawData: body as unknown as Prisma.InputJsonValue,
            errorMessage: "Payment failed via OEN Callback",
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: ORDER_STATUS.FAILED,
            data: {
              ...(order.data as IOenOrderData),
              checkoutResponse: body as unknown as Prisma.InputJsonValue,
            } as Prisma.InputJsonObject,
          },
        });
      }
    });

    return { shouldMint, creditsToMint, amountPaid };
  }

  async updateOrderMintFailed(
    orderId: string,
    orderData: object,
    responseBody: IOenCallbackData,
    errorMessage: string,
  ) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.MINT_FAILED,
        data: {
          ...orderData,
          checkoutResponse: responseBody as unknown as Prisma.InputJsonValue,
          error: errorMessage,
        } as Prisma.InputJsonObject,
      },
    });
  }

  async updateOrderCompleted(orderId: string, transactionHash: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.COMPLETED,
        transactionHash: transactionHash,
      },
    });
  }

  async createOrder(
    data: Prisma.OrderUncheckedCreateInput & { unit: CurrencyUnit },
  ) {
    if (!data.unit) {
      throw new Error("Order unit is explicitly required");
    }
    if (!Object.values(CURRENCY_UNIT).includes(data.unit)) {
      throw new Error(
        `Invalid order unit. Must be one of: ${Object.values(CURRENCY_UNIT).join(", ")}`,
      );
    }
    return prisma.order.create({ data });
  }

  async getOrderById(orderId: string) {
    return prisma.order.findUnique({ where: { id: orderId } });
  }

  async setOrderPaying(
    orderId: string,
    signature: string,
    transactionHash?: string,
  ) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.PAYING,
        signature: signature,
        transactionHash: transactionHash,
      },
    });
  }

  async completeOrderWithReceipt(
    orderId: string,
    signature: string,
    transactionHash?: string,
  ) {
    await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
      });
      if (!existingOrder) throw new Error("Order not found");

      const finalStatus =
        existingOrder.type === ORDER_TYPE.ANALYSIS
          ? ORDER_STATUS.PAID
          : ORDER_STATUS.COMPLETED;

      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: finalStatus,
          signature: signature,
          transactionHash: transactionHash,
        },
      });

      await tx.receipt.create({
        data: {
          orderId: order.id,
          amount: order.amount,
        },
      });
    });
  }

  async failOrder(orderId: string, reason: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    const existingData = order?.data
      ? (order.data as Record<string, unknown>)
      : {};

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.FAILED,
        data: { ...existingData, failureReason: reason },
      },
    });
  }

  async getPendingOenOrdersByUserId(userId: string) {
    return prisma.order.findMany({
      where: {
        userId,
        status: { in: [ORDER_STATUS.PENDING, ORDER_STATUS.MINT_FAILED] },
        type: ORDER_TYPE.OEN_PAYMENT,
        paymentTransactions: {
          some: {
            status: "SUCCESS",
          },
        },
      },
    });
  }

  async getOrderByIdAndUserId(orderId: string, userId: string) {
    return prisma.order.findUnique({
      where: { id: orderId, userId },
      select: {
        id: true,
        status: true,
        transactionHash: true,
        data: true,
      },
    });
  }

  async getOrdersByUserId(userId: string, type?: string | null) {
    return prisma.order.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
      },
      include: {
        paymentTransactions: {
          include: {
            paymentMethod: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getPaymentTransactionsByUserId(userId: string) {
    return prisma.paymentTransaction.findMany({
      where: { userId },
      include: { order: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPaymentMethodsByUserId(userId: string, provider: string) {
    const methods = await prisma.paymentMethod.findMany({
      where: { userId, provider },
      select: {
        id: true,
        provider: true,
        data: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Info: (20260409 - Luphia) Filter out soft-deleted payment methods
    return methods.filter(
      (m) =>
        !(
          m.data &&
          typeof m.data === "object" &&
          !Array.isArray(m.data) &&
          (m.data as Record<string, unknown>).isDeleted
        ),
    );
  }

  async getPaymentMethodById(id: string) {
    return prisma.paymentMethod.findUnique({
      where: { id },
    });
  }

  async updatePaymentMethodData(id: string, data: Prisma.InputJsonObject) {
    return prisma.paymentMethod.update({
      where: { id },
      data: { data },
    });
  }

  async getPaymentTransactionsByPaymentMethodId(
    paymentMethodId: string,
    userId: string,
  ) {
    return prisma.paymentTransaction.findMany({
      where: {
        paymentMethodId,
        userId,
      },
      include: {
        order: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateOrderData(orderId: string, data: Prisma.InputJsonObject) {
    return prisma.order.update({
      where: { id: orderId },
      data: { data },
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    additionalData?: Prisma.OrderUpdateInput,
  ) {
    return prisma.order.update({
      where: { id: orderId },
      data: { status, ...additionalData },
    });
  }

  async createPaymentTransactionAndUpdateOrder(
    userId: string,
    paymentMethodId: string,
    orderId: string,
    amount: number,
    orderData: object,
    authentication: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const paymentTransaction = await tx.paymentTransaction.create({
        data: {
          userId: userId,
          paymentMethodId: paymentMethodId,
          orderId: orderId,
          provider: "OEN",
          amount: amount,
          status: PAYMENT_TRANSACTION_STATUS.PENDING,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          data: {
            ...orderData,
            fidoAuthentication: authentication,
          } as Prisma.InputJsonObject,
        },
      });
      return paymentTransaction;
    });
  }

  async failPaymentTransactionAndOrder(
    paymentTransactionId: string,
    orderId: string,
    orderData: IOenOrderData,
    oenData: Prisma.InputJsonValue,
    authentication: string,
  ) {
    return prisma.$transaction([
      prisma.paymentTransaction.update({
        where: { id: paymentTransactionId },
        data: {
          status: PAYMENT_TRANSACTION_STATUS.FAILED,
          rawData: oenData,
          errorMessage: "Payment failed via OEN",
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.PAYMENT_FAILED,
          data: {
            ...orderData,
            checkoutResponse: oenData,
            fidoAuthentication: authentication,
          } as Prisma.InputJsonObject,
        },
      }),
    ]);
  }

  async completePaymentTransactionAndOrder(
    paymentTransactionId: string,
    orderId: string,
    userId: string,
    userName: string,
    amount: number,
    credits: number,
    orderData: IOenOrderData,
    oenData: Prisma.InputJsonValue,
    authentication: string,
  ) {
    let dbReceiptId: string = "";
    await prisma.$transaction(async (tx) => {
      const dbReceipt = await tx.receipt.create({
        data: {
          orderId: orderId,
          amount: amount,
          data: {
            ...(oenData as Record<string, unknown>),
            receiptDetails: {
              amount: amount,
              credits,
              transactionTime: new Date().toISOString(),
              buyerId: userId,
              buyerName: userName,
              itemDescription: `iSunFA Credits - ${credits}`,
              gatewayTxId:
                (oenData as { data?: { id?: string }; id?: string })?.data
                  ?.id ||
                (oenData as { data?: { id?: string }; id?: string })?.id ||
                "",
            },
          } as Prisma.InputJsonObject,
        },
      });
      dbReceiptId = dbReceipt.id;

      await tx.paymentTransaction.update({
        where: { id: paymentTransactionId },
        data: { status: PAYMENT_TRANSACTION_STATUS.SUCCESS, rawData: oenData },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.PAID,
          data: {
            ...orderData,
            checkoutResponse: oenData,
            receiptId: dbReceiptId,
            fidoAuthentication: authentication,
          } as Prisma.InputJsonObject,
        },
      });
    });
    return dbReceiptId;
  }

  // Info: (20260416 - Agent) Admin Billing global metric methods
  private buildDateWhereClause(
    startDate?: Date,
    endDate?: Date,
  ): Prisma.OrderWhereInput {
    const whereClause: Prisma.OrderWhereInput = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }
    return whereClause;
  }

  async getGlobalRevenueTotal(
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const where = this.buildDateWhereClause(startDate, endDate);
    where.type = ORDER_TYPE.OEN_PAYMENT;
    where.status = { in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] };

    const agg = await prisma.order.aggregate({
      _sum: { amount: true },
      where,
    });
    return agg._sum.amount || 0;
  }

  async getGlobalTransactingUsersCount(
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const where = this.buildDateWhereClause(startDate, endDate);
    where.type = ORDER_TYPE.OEN_PAYMENT;
    where.status = { in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] };

    const agg = await prisma.order.groupBy({
      by: ["userId"],
      where,
    });
    return agg.length;
  }

  async getGlobalPointsPurchasedTotal(
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const where = this.buildDateWhereClause(startDate, endDate);
    where.type = ORDER_TYPE.OEN_PAYMENT;
    where.status = { in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] };

    const orders = await prisma.order.findMany({
      where,
      select: { data: true },
    });

    let total = 0;
    orders.forEach((o) => {
      const data = o.data as { credits?: number };
      if (data && data.credits) {
        total += data.credits;
      }
    });
    return total;
  }

  async getGlobalPointsConsumedTotal(
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const where = this.buildDateWhereClause(startDate, endDate);
    where.type = {
      notIn: [
        ORDER_TYPE.OEN_PAYMENT,
        ORDER_TYPE.OEN_BINDING,
        ORDER_TYPE.CHECK_IN_REWARD,
        ORDER_TYPE.REGISTRATION_REWARD,
        ORDER_TYPE.ADMIN_ISSUED,
      ],
    };
    where.status = { in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] };
    where.amount = { gt: 0 };

    const agg = await prisma.order.aggregate({
      _sum: { amount: true },
      where,
    });
    return agg._sum.amount || 0;
  }

  async countGlobalOrders(startDate?: Date, endDate?: Date): Promise<number> {
    const where = this.buildDateWhereClause(startDate, endDate);
    where.type = ORDER_TYPE.OEN_PAYMENT;
    where.status = { in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] };
    return prisma.order.count({ where });
  }

  async getGlobalOrdersPaginated(
    startDate?: Date,
    endDate?: Date,
    skip: number = 0,
    take: number = 20,
  ) {
    const where = this.buildDateWhereClause(startDate, endDate);
    where.type = ORDER_TYPE.OEN_PAYMENT;
    where.status = { in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] };
    return prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
  }

  async countGlobalPointUsages(
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const where = this.buildDateWhereClause(startDate, endDate);
    where.type = { notIn: [ORDER_TYPE.OEN_PAYMENT, ORDER_TYPE.OEN_BINDING] };
    where.status = { in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] };
    return prisma.order.count({ where });
  }

  async getGlobalPointUsagesPaginated(
    startDate?: Date,
    endDate?: Date,
    skip: number = 0,
    take: number = 20,
  ) {
    const where = this.buildDateWhereClause(startDate, endDate);
    where.type = { notIn: [ORDER_TYPE.OEN_PAYMENT, ORDER_TYPE.OEN_BINDING] };
    where.status = { in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] };
    return prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
  }
  async countGlobalPaymentTransactions(
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const where: Prisma.PaymentTransactionWhereInput = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    return prisma.paymentTransaction.count({ where });
  }

  async getGlobalPaymentTransactionsPaginated(
    startDate?: Date,
    endDate?: Date,
    skip: number = 0,
    take: number = 20,
  ) {
    const where: Prisma.PaymentTransactionWhereInput = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    return prisma.paymentTransaction.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: true, order: true },
    });
  }
}

export const paymentRepo = new PaymentRepository();

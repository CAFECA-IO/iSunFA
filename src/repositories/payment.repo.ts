import { prisma } from "@/lib/prisma";
import { Prisma, Order, User } from "@/generated/client";
import {
  ORDER_STATUS,
  PAYMENT_TRANSACTION_STATUS,
  ORDER_TYPE,
} from "@/constants/status";
import { IOenCallbackData, IOenOrderData } from "@/interfaces/payment";

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
          const dbReceipt = await tx.receipt.create({
            data: {
              orderId: order.id,
              amount: order.amount,
              data: {
                ...body,
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

  async createOrder(data: Prisma.OrderUncheckedCreateInput) {
    return prisma.order.create({ data });
  }

  async getOrderById(orderId: string) {
    return prisma.order.findUnique({ where: { id: orderId } });
  }

  async completeOrderWithReceipt(
    orderId: string,
    signature: string,
    transactionHash?: string,
  ) {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.COMPLETED,
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

  async getPaymentMethodsByUserId(userId: string, provider: string) {
    return prisma.paymentMethod.findMany({
      where: { userId, provider },
      select: {
        id: true,
        provider: true,
        data: true,
        isDefault: true,
        createdAt: true,
      },
    });
  }

  async updateOrderData(orderId: string, data: Prisma.InputJsonObject) {
    return prisma.order.update({
      where: { id: orderId },
      data: { data },
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
              gatewayTxId: (oenData as { data?: { id?: string }; id?: string })?.data?.id || (oenData as { data?: { id?: string }; id?: string })?.id || "",
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
}

export const paymentRepo = new PaymentRepository();

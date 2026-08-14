import { prisma } from "@/lib/prisma";
import { Prisma, Order, User } from "@/generated";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TRANSACTION_STATUS,
  ORDER_TYPE,
} from "@/constants/status";
import { IOenCallbackData, IOenOrderData } from "@/interfaces/payment";
import { buildReceiptDataToSave } from "@/lib/utils/payment_helpers";
import { CurrencyUnit, CURRENCY_UNIT } from "@/constants/price";
import { MoneyUtil } from "@/lib/utils/money";
import { creditPoolInTx } from "@/repositories/team_wallet.repo";
import { applyTeamSubscriptionInTx } from "@/repositories/team_subscription.repo";
import {
  BILLING_INTERVAL,
  BillingInterval,
  WALLET_OP_OUTCOME,
} from "@/constants/subscription_quota";

export interface IOrderWithUser extends Order {
  user: User | null;
}

/**
 * Info: (20260814 - Luphia) 已扣款但無法履行時，把訂單標記為 MINT_FAILED 並寫入原因。
 *
 * 這裡刻意**不 throw**：webhook 的交易一旦回滾，收款紀錄（receipt、paymentTransaction）
 * 會一起消失，金流商還會不斷重送——錢收了卻查無此事，比履行失敗本身更難處理。
 * 因此收款照記，改把訂單推進到「已扣款、未履行」這個既有狀態：前端的訂單查詢會帶出
 * data.error，後台訂單管理也篩得到，人工介入有依據。
 *
 * MINT_FAILED 的字面是鏈上鑄造失敗，這裡借用於離鏈履行（入池、套用方案）：
 * 語意同為「款已收、貨未到」，且前端與後台都已認得這個狀態，另立新狀態的代價更大。
 */
async function markFulfillmentFailedInTx(
  tx: Prisma.TransactionClient,
  order: IOrderWithUser,
  reason: string,
): Promise<void> {
  // Info: (20260814 - Luphia) 靜默是這裡最大的風險，log 與 DB 兩邊都要留痕
  console.error(
    `[payment] order ${order.id} (${order.type}) paid but not fulfilled: ${reason}`,
  );
  await tx.order.update({
    where: { id: order.id },
    data: {
      status: ORDER_STATUS.MINT_FAILED,
      data: {
        ...((order.data as Prisma.InputJsonObject) ?? {}),
        error: reason,
      } as Prisma.InputJsonObject,
    },
  });
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
    let amountPaid = 0n;

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
        status === PAYMENT_STATUS.SUCCESS ||
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
        } else if (
          order.type === ORDER_TYPE.OEN_PAYMENT ||
          order.type === ORDER_TYPE.BILLING_TEAM_POINT ||
          order.type === ORDER_TYPE.BILLING_SEAT_ADDITION ||
          /**
           * Info: (20260814 - Luphia) 訂閱訂單一律進本分支，不再以 data.teamId 當門檻。
           * 原本缺 teamId 的訂閱訂單連這個分支都進不來：不開收據、不改狀態、不報錯，
           * 訂單就停在 PENDING——錢收了，而系統對此一無所知。
           * 缺件改由下方履行段落標記為「已扣款未履行」，讓它浮上來。
           */
          order.type === ORDER_TYPE.BILLING_SUBSCRIBE
        ) {
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
                  gatewayTxId: body.data?.id,
                },
              } as Prisma.InputJsonObject,
            },
          });

          await tx.paymentTransaction.updateMany({
            where: { orderId: order.id },
            data: {
              status: PAYMENT_TRANSACTION_STATUS.SUCCESS,
              rawData: body as Prisma.InputJsonObject,
            },
          });

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: ORDER_STATUS.PAID,
              data: {
                ...(order.data as IOenOrderData),
                checkoutResponse: body as Prisma.InputJsonObject,
                receiptId: dbReceipt.id,
              } as Prisma.InputJsonObject,
            },
          });

          if (order.type === ORDER_TYPE.BILLING_TEAM_POINT) {
            /**
             * Info: (20260807 - Luphia) 團隊購點分流（設計書 §6.1）：
             * 不 mint 鏈上點數，於同一交易內原子入池（冪等鍵 purchase:{orderId}）。
             * 入池成功即 COMPLETED；錢包凍結或資料缺 teamId 時訂單停在 PAID 供人工介入。
             */
            const teamId = (order.data as IOenOrderData & { teamId?: string })
              ?.teamId;
            if (!teamId || _creditsToMint <= 0) {
              await markFulfillmentFailedInTx(
                tx,
                order,
                `team point order missing ${!teamId ? "teamId" : "credits"}`,
              );
            } else {
              const credited = await creditPoolInTx(tx, {
                teamId,
                credits: BigInt(_creditsToMint),
                orderId: order.id,
                operatorUserId: order.userId,
                idempotencyKey: `purchase:${order.id}`,
              });
              if (
                credited.outcome === WALLET_OP_OUTCOME.OK ||
                credited.outcome === WALLET_OP_OUTCOME.DUPLICATE
              ) {
                await tx.order.update({
                  where: { id: order.id },
                  data: { status: ORDER_STATUS.COMPLETED },
                });
              } else {
                // Info: (20260814 - Luphia) 錢包凍結等入池失敗：留痕供人工介入，不吞掉
                await markFulfillmentFailedInTx(
                  tx,
                  order,
                  `credit pool rejected: ${credited.outcome}`,
                );
              }
            }
            amountPaid = order.amount;
          } else if (order.type === ORDER_TYPE.BILLING_SEAT_ADDITION) {
            /**
             * Info: (20260814 - Luphia) 席次補收由發起端（邀請 / 加成員）同步履行：
             * 它拿得到 OEN 的即時回應，扣款成功當下就加席並標記 COMPLETED。
             * 這裡只記收款、不重複加席——webhook 若在同步流程完成前先到，
             * 兩邊都加一次就會讓團隊平白多出一個席次的帳。
             */
            amountPaid = order.amount;
          } else if (order.type === ORDER_TYPE.BILLING_SUBSCRIBE) {
            /**
             * Info: (20260807 - Luphia) 團隊訂閱履行（設計書 §7 PUT /subscription）：
             * 於同一交易內套用方案並完成訂單，不 mint 鏈上點數。
             */
            const subData = order.data as IOenOrderData & {
              teamId?: string;
              planId?: string;
              billingInterval?: BillingInterval;
              seats?: number;
              unitPrice?: number;
            };
            if (!subData.teamId || !subData.planId) {
              /**
               * Info: (20260814 - Luphia) 訂閱訂單不知道要套用到哪個團隊 / 哪個方案，
               * 就是履行失敗。這種訂單不該存在（建單端一律帶齊），但真的出現時
               * 必須看得見——靜靜停在 PAID 等於沒有人會發現用戶付了錢沒拿到方案。
               */
              await markFulfillmentFailedInTx(
                tx,
                order,
                `subscription order missing ${!subData.teamId ? "teamId" : "planId"}`,
              );
            } else {
              await applyTeamSubscriptionInTx(tx, {
                teamId: subData.teamId,
                planId: subData.planId,
                billingInterval:
                  subData.billingInterval ?? BILLING_INTERVAL.MONTH,
                orderId: order.id,
                nowMs: Date.now(),
                // Info: (20260814 - Luphia) 席次與單價快照（規範 P2），續訂與期中補收都靠它
                seats: subData.seats,
                unitPrice: subData.unitPrice,
              });
              await tx.order.update({
                where: { id: order.id },
                data: { status: ORDER_STATUS.COMPLETED },
              });
            }
            amountPaid = order.amount;
          } else {
            shouldMint = true;
            creditsToMint = _creditsToMint;
            amountPaid = order.amount;
          }
        }
      } else if (!isPaymentSuccess && order.status === ORDER_STATUS.PENDING) {
        await tx.paymentTransaction.updateMany({
          where: { orderId: order.id },
          data: {
            status: PAYMENT_TRANSACTION_STATUS.FAILED,
            rawData: body as Prisma.InputJsonObject,
            errorMessage: "Payment failed via OEN Callback",
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: ORDER_STATUS.FAILED,
            data: {
              ...(order.data as IOenOrderData),
              checkoutResponse: body as Prisma.InputJsonObject,
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
          checkoutResponse: responseBody as Prisma.InputJsonObject,
          error: errorMessage,
        } as Prisma.InputJsonObject,
      },
    });
  }

  // Info: (20260807 - Luphia) transactionHash 改為可選：團隊購點入池為離鏈履行，無鏈上交易
  async updateOrderCompleted(orderId: string, transactionHash?: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.COMPLETED,
        ...(transactionHash ? { transactionHash } : {}),
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

    const safeData = {
      ...data,
      amount:
        typeof data.amount === "number" || typeof data.amount === "string"
          ? BigInt(MoneyUtil.toDecimal(data.amount).round().toString())
          : data.amount,
    };

    return prisma.order.create({ data: safeData });
  }

  /**
   * Info: (20260813 - Luphia) 以冪等鍵查用戶的訂單（個人點數扣款路徑，設計書 §5.5）。
   * 鍵存於 data.idempotencyKey：同一則訊息重送時要找回原訂單，
   * 而不是每次重試都建一張新的待付訂單。
   */
  async findOrderByIdempotencyKey(userId: string, idempotencyKey: string) {
    return prisma.order.findFirst({
      where: {
        userId,
        data: { path: ["idempotencyKey"], equals: idempotencyKey },
      },
      orderBy: { createdAt: "desc" },
    });
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
            status: PAYMENT_TRANSACTION_STATUS.SUCCESS,
          },
        },
      },
    });
  }

  /**
   * Info: (20260810 - Luphia) 以 challenge 反查「這位使用者自己的」未結案訂單。
   * 託管代簽用來驗證 challenge 出處：必須綁定 userId，否則等於可以拿別人的
   * challenge 來借簽。
   */
  async findOrderByUserAndChallenge(
    userId: string,
    challenge: string,
    statuses: string[],
  ) {
    return prisma.order.findFirst({
      where: { userId, challenge, status: { in: statuses } },
      select: { id: true },
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
        createdAt: true,
        amount: true,
      },
    });
  }

  async getOrdersByUserId(userId: string, type?: string | null) {
    const where: Prisma.OrderWhereInput = { userId };
    if (type === "billing") {
      where.OR = [
        { type: { startsWith: "BILLING_" } },
        { type: ORDER_TYPE.OEN_PAYMENT },
      ];
    } else if (type) {
      where.type = type;
    }

    return prisma.order.findMany({
      where,
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

  async updateOrderData(orderId: string, data: Record<string, unknown>) {
    return prisma.order.update({
      where: { id: orderId },
      data: { data: data as Prisma.InputJsonObject },
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    tokens?: number,
    additionalData?: Prisma.OrderUpdateInput,
  ) {
    const data: Prisma.OrderUpdateInput = { status, ...additionalData };
    if (tokens !== undefined) {
      data.tokens = tokens;
    }
    return prisma.order.update({
      where: { id: orderId },
      data,
    });
  }

  async createPaymentTransactionAndUpdateOrder(
    userId: string,
    paymentMethodId: string,
    orderId: string,
    amount: bigint,
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
    amount: bigint,
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
  ): Promise<bigint> {
    const where = this.buildDateWhereClause(startDate, endDate);
    where.type = ORDER_TYPE.OEN_PAYMENT;
    where.status = { in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] };

    const agg = await prisma.order.aggregate({
      _sum: { amount: true },
      where,
    });
    return agg._sum.amount || 0n;
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
  ): Promise<bigint> {
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
    return agg._sum.amount || 0n;
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

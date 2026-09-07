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

/**
 * Info: (20260814 - Luphia) 收據品項描述。
 *
 * 原本一律寫 `iSunFA Credits - {credits}`，於是訂閱的收據會寫「Credits - 1500」——
 * 而訂閱一點錢包點數都沒有發（履行只寫 TeamSubscription）。收據是對外憑證，
 * 描述必須與實際交付的東西一致：訂閱交付的是方案與席次，不是點數。
 */
function buildReceiptItemDescription(
  orderType: string | null,
  credits: number,
  data: {
    planId?: string;
    seats?: number;
    billingInterval?: string;
    seatAddition?: boolean;
  } | null,
): string {
  /**
   * Info: (20260814 - Luphia) 綁卡直扣路徑只拿得到 orderData（沒有 order.type），
   * 以資料形狀回推：訂閱一定同時帶 planId 與 billingInterval，席次補收帶 seatAddition。
   */
  const kind =
    orderType ??
    (data?.seatAddition
      ? ORDER_TYPE.BILLING_SEAT_ADDITION
      : data?.planId && data?.billingInterval
        ? ORDER_TYPE.BILLING_SUBSCRIBE
        : ORDER_TYPE.OEN_PAYMENT);
  if (kind === ORDER_TYPE.BILLING_SUBSCRIBE) {
    const plan = data?.planId ?? "team";
    const seats = data?.seats ?? 1;
    const interval = data?.billingInterval ?? BILLING_INTERVAL.MONTH;
    return `iSunFA Team Subscription - ${plan} (${interval}) x${seats} seat(s)`;
  }
  if (kind === ORDER_TYPE.BILLING_SEAT_ADDITION) {
    return `iSunFA Team Seat Addition - ${data?.seats ?? 1} seat(s)`;
  }
  return `iSunFA Credits - ${credits}`;
}

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

/**
 * Info: (20260818 - Luphia) 哪些訂單狀態算「已經扣過款」（第三輪 A-2）。
 *
 * 判準是「這筆錢是否可能已經或即將離開用戶的帳戶」：
 * - `PENDING` / `PAYING`：扣款在路上，重複建單會變成扣兩次
 * - `PAID` / `EXECUTING` / `COMPLETED`：錢收到了
 * - `MINT_FAILED`：**錢收到了**，只是後續履行失敗——那要走補償，不是重收一次
 *
 * 不在此列的 `PAYMENT_FAILED` / `FAILED` / `CANCEL` 一律視為沒扣過，
 * 重試會真的再扣一次款。
 */
const REPLAYABLE_ORDER_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PAYING,
  ORDER_STATUS.PAID,
  ORDER_STATUS.EXECUTING,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.MINT_FAILED,
] as const;

function isChargeableOrderStatus(status: string): boolean {
  return (REPLAYABLE_ORDER_STATUSES as readonly string[]).includes(status);
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
                  itemDescription: buildReceiptItemDescription(
                    order.type,
                    _creditsToMint,
                    order.data as {
                      planId?: string;
                      seats?: number;
                      billingInterval?: string;
                    } | null,
                  ),
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
    /**
     * Info: (20260815 - Luphia) 先查真欄位，查不到再回頭找 JSON path（第二輪 B-3）。
     *
     * 冪等鍵已升格為帶唯一約束的欄位，但改版前建立的訂單只有 `data.idempotencyKey`；
     * 兩邊都查才不會讓舊訂單在重試時被當成「沒扣過」而再扣一次。
     *
     * Info: (20260818 - Luphia) **只有「錢真的在路上或已經到」的訂單算重放**（第三輪 A-2）。
     *
     * 原本不看 `status`，而扣款失敗只把訂單改成 `PAYMENT_FAILED`、`idempotencyKey`
     * 這個唯一欄位原封留著。於是管理員在畫面上重按一次邀請，就會找到那張失敗的訂單、
     * 走進重放分支——不扣款、不加席次，卻照樣建立邀請並寄信。**一個沒付錢的席次。**
     *
     * 失敗與取消的訂單必須被視為「沒扣過」，重試才會真的再扣一次款。
     */
    const byColumn = await prisma.order.findUnique({
      where: { idempotencyKey },
    });
    if (
      byColumn &&
      byColumn.userId === userId &&
      isChargeableOrderStatus(byColumn.status)
    ) {
      return byColumn;
    }

    return prisma.order.findFirst({
      where: {
        userId,
        data: { path: ["idempotencyKey"], equals: idempotencyKey },
        status: { in: [...REPLAYABLE_ORDER_STATUSES] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Info: (20260820 - Luphia) 釋放訂單佔用的冪等鍵（self-review 第二輪，中）。
   *
   * `order.idempotency_key` 是**唯一欄位**，而扣款失敗後那把鍵仍被那張
   * `PAYMENT_FAILED` 的訂單佔著。`findOrderByIdempotencyKey` 刻意排除失敗狀態
   *（「失敗必須被視為沒扣過」），於是下一次重試查不到、去建新單，然後撞 P2002。
   *
   * 症狀分兩種，都很難從外面看出來：
   *
   * - **續訂**：cron 每小時噴一次 unique 衝突，永遠續不上，直到寬限期用盡降級 free。
   * - **席次補收**：P2002 被當成「重放」吞掉，回 `charged: false`——
   *   於是邀請照樣寄出，**那是一個沒付錢的席次**。
   *
   * 因此重試前把鍵放掉，`data.idempotencyKey` 留著供稽核（那一欄不是唯一）。
   */
  async releaseIdempotencyKey(orderId: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: { idempotencyKey: null },
    });
  }

  /**
   * Info: (20260820 - Luphia) 取消一張已被取代的未付訂單（self-review 第二輪，小）。
   *
   * 沿用未付訂單時若金額已過期（席次變動），會改建新單——而舊那張仍是可付的：
   * 使用者從另一個分頁或訂單列表把它付掉，就以舊金額成交。標記 CANCEL 讓它
   * 不再是一條可走的路。
   */
  async cancelOrder(orderId: string, reason: string): Promise<void> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    const data = (order.data ?? {}) as Record<string, unknown>;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.CANCEL,
        // Info: (20260820 - Luphia) 一併放掉冪等鍵：取消的訂單不該佔著唯一欄位
        idempotencyKey: null,
        data: { ...data, cancelReason: reason } as Prisma.InputJsonObject,
      },
    });
  }

  /**
   * Info: (20260820 - Luphia) 同一個團隊、同方案同週期的**未付**訂閱訂單（self-review B-4）。
   *
   * 訂閱建單原本沒有任何冪等保護：雙擊或開兩個分頁就是兩張都能付的訂單，
   * 而履行會把週期覆寫掉——**付兩次只拿到一期**。
   *
   * 只認 PENDING / PAYING（錢還沒到）：
   *
   * - `PAID` / `COMPLETED` 代表錢已經收了，那不是重複點擊而是**再買一期**，
   *   應該建新單（展延，見 `applyTeamSubscriptionInTx`）。把它回給前端會讓人
   *   去付一張已經付過的單。
   * - `PAYMENT_FAILED` / `CANCEL` 必須當成「沒扣過」，否則重試永遠拿到那張壞單。
   */
  async findInFlightSubscriptionOrder(params: {
    userId: string;
    teamId: string;
    planId: string;
    billingInterval: string;
  }) {
    return prisma.order.findFirst({
      where: {
        userId: params.userId,
        type: ORDER_TYPE.BILLING_SUBSCRIBE,
        status: { in: [ORDER_STATUS.PENDING, ORDER_STATUS.PAYING] },
        AND: [
          { data: { path: ["teamId"], equals: params.teamId } },
          { data: { path: ["planId"], equals: params.planId } },
          {
            data: {
              path: ["billingInterval"],
              equals: params.billingInterval,
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Info: (20260814 - Luphia) 本期已補收的席次費用合計（PR #6652 第二輪 B-2）。
   *
   * 用於「單期補收總額上限」：邀請開放 OWNER / ADMIN，但扣的是訂閱那張卡，
   * 沒有上限就等於允許一位管理員替擁有者的卡連刷。
   * 只算已完成的訂單——失敗或待付的不佔額度。
   */
  async sumSeatAdditionAmount(teamId: string, since: Date): Promise<bigint> {
    const orders = await prisma.order.findMany({
      where: {
        type: ORDER_TYPE.BILLING_SEAT_ADDITION,
        status: ORDER_STATUS.COMPLETED,
        createdAt: { gte: since },
        data: { path: ["teamId"], equals: teamId },
      },
      select: { amount: true },
    });
    return orders.reduce((sum, order) => sum + order.amount, BigInt(0));
  }

  /**
   * Info: (20260821 - Luphia) 某人最近的訂閱訂單（`scripts/diagnose_subscription_state.ts`）。
   *
   * 「我明明訂閱了，畫面還顯示免費版」有兩個成因（顯示端／履行端），而分辨它們
   * 需要看得到訂單狀態：有 PAID / COMPLETED 的訂單而訂閱仍是 free，
   * 問題就在履行路徑。查詢放 Repo——只有 Repository 碰得到 Prisma（CLAUDE.md §1）。
   */
  async listRecentSubscriptionOrders(userId: string, take: number) {
    return prisma.order.findMany({
      where: { userId, type: ORDER_TYPE.BILLING_SUBSCRIBE },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        status: true,
        amount: true,
        createdAt: true,
        data: true,
      },
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
              itemDescription: buildReceiptItemDescription(
                null,
                credits,
                orderData as {
                  planId?: string;
                  seats?: number;
                  billingInterval?: string;
                  seatAddition?: boolean;
                },
              ),
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

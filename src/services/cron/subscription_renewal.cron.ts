import { logger } from "@/lib/utils/logger";
import { CURRENCY_UNIT } from "@/constants/price";
import { getPlanUnitPrice } from "@/services/plan.service";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import {
  BILLING_INTERVAL,
  BillingInterval,
  TEAM_PLAN,
  TeamPlanId,
} from "@/constants/subscription_quota";
import { chargeOrderWithSavedCard } from "@/services/team_billing.service";
import { generatePaymentOrder } from "@/services/order.service";
import { resolvePlanId } from "@/lib/subscription/plan_rules";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamRepo } from "@/repositories/team.repo";
import { resolveSubscriptionAmount } from "@/lib/billing/seat_billing";
import { paymentRepo } from "@/repositories/payment.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";

/**
 * Info: (20260807 - Luphia) autoRenew 自動扣款續訂（設計書 §9 P4 待辦收尾）。
 * SubscriptionExpiry 先把過期的 autoRenew 訂閱標成 PAST_DUE（額度即刻 fail-closed），
 * 本 Worker 對 PAST_DUE + autoRenew 者以「上一張訂單的綁定卡」發起 OEN token 扣款：
 * 成功 → 建新 BILLING_SUBSCRIBE 訂單 + 套用新週期；失敗 → 留 PAST_DUE 下輪重試；
 * 逾寬限期（預設 3 天）仍未成功 → 降級 free（不無限重試扣款，避免對用戶卡片反覆請款）。
 */

const RENEWAL_GRACE_MS = 3 * 86_400_000;
// Info: (20260807 - Luphia) 續訂為 merchant-initiated 交易，無 FIDO 簽章；此標記寫入訂單供稽核
const RENEWAL_AUTH_MARKER = JSON.stringify({ verifiedVia: "auto_renewal" });

export interface IRenewalRunResult {
  attempted: number;
  renewed: number;
  failed: number;
  downgraded: number;
  skipped: number;
}

interface IRenewableOrderData {
  paymentMethodId?: string;
  billingInterval?: BillingInterval;
}

/**
 * Info: (20260820 - Luphia) 續訂的冪等鍵：一期一把。
 *
 * 抽成函式而不是就地拼字串：回收路徑（找既有訂單）與建單路徑必須用**同一把**，
 * 兩處各拼一次遲早分岔，而分岔的症狀是「找不到既有訂單 → 再扣一次款」。
 */
function renewalIdempotencyKey(teamId: string, periodStart: Date): string {
  return `renew:${teamId}:p${periodStart.getTime()}`;
}

// Info: (20260820 - Luphia) 套用續訂結果（正常路徑與「扣款成功但套用失敗」的回收路徑共用）
async function applyRenewedSubscription(params: {
  teamId: string;
  planId: string;
  billingInterval: BillingInterval;
  orderId: string;
  nowMs: number;
  seats: number;
  unitPrice: number;
}): Promise<void> {
  await teamSubscriptionRepo.applyTeamSubscription({
    teamId: params.teamId,
    planId: params.planId,
    billingInterval: params.billingInterval,
    orderId: params.orderId,
    nowMs: params.nowMs,
    seats: Math.max(1, params.seats),
    unitPrice: params.unitPrice,
  });
}

async function renewOne(
  sub: {
    teamId: string;
    planId: string;
    pendingPlanId: string | null;
    latestOrderId: string | null;
    // Info: (20260820 - Luphia) 冪等鍵綁「正在到期的那一期」，見 renewalIdempotencyKey
    currentPeriodStart: Date;
  },
  nowMs: number,
): Promise<"renewed" | "failed" | "skipped"> {
  /**
   * Info: (20260820 - Luphia) 續訂用的是**排程中的方案**（若有）。
   *
   * 降級不期中生效（退款政策 §2.1），而週期邊界就是它生效的地方——續訂在這裡
   * 依新方案計價、建單、套用，`applyTeamSubscription` 隨即把排程清掉。
   *
   * 排程降到 free 的列不會走到這裡：那種列的 `autoRenew` 已關閉，
   * 由 `expireOverdue` 在期末落地（`listPastDueAutoRenew` 只撈 autoRenew=true）。
   * 這裡仍留一道 free 的早退，讓「排程 free 卻仍自動續訂」這種不該存在的組合
   * 不會變成一張免費方案的收費訂單。
   */
  const planId = resolvePlanId(sub.pendingPlanId ?? sub.planId) as Exclude<
    TeamPlanId,
    typeof TEAM_PLAN.FREE
  >;
  if ((planId as TeamPlanId) === TEAM_PLAN.FREE) return "skipped";

  if (!sub.latestOrderId) {
    logger.warn("subscription renewal skipped: no latest order", {
      teamId: sub.teamId,
    });
    return "skipped";
  }
  const lastOrder = await paymentRepo.getOrderById(sub.latestOrderId);
  const lastData = (lastOrder?.data ?? {}) as IRenewableOrderData;
  if (!lastOrder || !lastData.paymentMethodId) {
    logger.warn("subscription renewal skipped: no payment method on record", {
      teamId: sub.teamId,
      latestOrderId: sub.latestOrderId,
    });
    return "skipped";
  }

  const paymentMethod = await paymentRepo.getPaymentMethodById(
    lastData.paymentMethodId,
  );
  if (!paymentMethod?.token) {
    logger.warn("subscription renewal skipped: payment method token missing", {
      teamId: sub.teamId,
      paymentMethodId: lastData.paymentMethodId,
    });
    return "skipped";
  }

  const user = await webAuthnRepo.findUserById(lastOrder.userId);
  if (!user) return "skipped";

  const billingInterval = lastData.billingInterval ?? BILLING_INTERVAL.MONTH;
  /**
   * Info: (20260814 - Luphia) 續訂時**依當下人數重算席次**（規範 P2）：
   * 期中離職的席次要停止收費，期中加入但已比例補收過的席次則從新一期起整期計。
   * 沿用上一期的席次數會讓帳愈拖愈偏。
   */
  // Info: (20260819 - Luphia) 單價經 `plan.service` 的單一出口（集中化 20260819）
  const unitPrice = getPlanUnitPrice(planId, billingInterval);
  const seats = await teamRepo.countMembers(sub.teamId);
  const amount = resolveSubscriptionAmount(unitPrice, seats);

  /**
   * Info: (20260820 - Luphia) 續訂的冪等鍵綁「正在到期的那一期」（self-review B-6）。
   *
   * 原本完全沒有鍵。扣款成功但 `applyTeamSubscription` 失敗時（DB 短暫故障），
   * 訂閱仍是 PAST_DUE + autoRenew，於是**下一小時再建一張新單、再扣一次款**——
   * 而使用者已經付過這一期了。沒有任何地方認得出「這一期收過錢」。
   *
   * 綁期初而不是「當下時間」：同一期只會有一把鍵，而下一期換一把。
   */
  const idempotencyKey = renewalIdempotencyKey(
    sub.teamId,
    sub.currentPeriodStart,
  );
  const existing = await paymentRepo.findOrderByIdempotencyKey(
    lastOrder.userId,
    idempotencyKey,
  );
  if (existing) {
    /**
     * Info: (20260820 - Luphia) 這一期已經有一張「錢在路上或已經到」的訂單。
     *
     * 兩種狀態要分開處置，因為一種是**錢已經收了而權益沒給**，另一種還沒定案：
     *
     * - `COMPLETED`：扣款成功、套用失敗（否則這一列不會還在 PAST_DUE 名單裡）。
     *   直接補套用，不再扣款。
     * - 其他（PENDING / PAYING / PAID）：結果還沒定案，這一輪跳過。
     *   再送一次請款等於重複扣款，而金流商那邊可能正在處理。
     */
    if (existing.status === ORDER_STATUS.COMPLETED) {
      await applyRenewedSubscription({
        teamId: sub.teamId,
        planId,
        billingInterval,
        orderId: existing.id,
        nowMs,
        seats: await teamRepo.countMembers(sub.teamId),
        unitPrice,
      });
      logger.warn("subscription renewal recovered from a completed charge", {
        teamId: sub.teamId,
        orderId: existing.id,
      });
      return "renewed";
    }
    logger.info("subscription renewal skipped: charge already in flight", {
      teamId: sub.teamId,
      orderId: existing.id,
      status: existing.status,
    });
    return "skipped";
  }

  const renewalOrder = await generatePaymentOrder(lastOrder.userId, {
    type: ORDER_TYPE.BILLING_SUBSCRIBE,
    amount,
    unit: CURRENCY_UNIT.TWD,
    // Info: (20260814 - Luphia) 續訂同樣不發點數（見 changeTeamSubscription 的說明）
    credits: 0,
    paymentMethodId: paymentMethod.id,
    title: `iSunFA Team Subscription Renewal - ${planId} (${billingInterval})`,
    planId,
    billingInterval,
    seats: Math.max(1, seats),
    unitPrice,
    /**
     * Info: (20260814 - Luphia) teamId 必須是頂層欄位：generatePaymentOrder 會把
     * params.data 沉一層到 order.data.data，而履行端讀的是 order.data.teamId。
     * 續訂雖然由本函式自行套用方案（不靠訂單欄位），但 webhook 若在完成前先到，
     * 讀不到 teamId 就會把這張單標記為「已扣款未履行」。
     */
    teamId: sub.teamId,
    idempotencyKey,
    data: { renewal: true },
  });
  const orderData = {
    teamId: sub.teamId,
    planId,
    billingInterval,
    seats: Math.max(1, seats),
    unitPrice,
    renewal: true,
    paymentMethodId: paymentMethod.id,
    // Info: (20260807 - Luphia) IOenOrderData.amount 為字串（金額以字串傳輸避免浮點誤差）
    amount: String(amount),
    credits: 0,
  };

  // Info: (20260814 - Luphia) 扣款流程與席次補收共用（team_billing.service），兩邊不各長一套
  const charge = await chargeOrderWithSavedCard({
    userId: lastOrder.userId,
    userName: user.name ?? null,
    orderId: renewalOrder.orderId,
    amount,
    /**
     * Info: (20260814 - Luphia) 續訂同樣不發點數（PR #6652 第二輪 B-1）。
     * 這一行漏改，於是收據的 receiptDetails.credits 寫著 1,500 點，
     * 與同一張訂單的 data.credits = 0 自相矛盾——而收據是對外憑證。
     */
    credits: 0,
    orderData,
    paymentMethod: {
      id: paymentMethod.id,
      token: paymentMethod.token,
      data: paymentMethod.data,
    },
    authMarker: RENEWAL_AUTH_MARKER,
  });

  if (!charge.ok) {
    logger.error("subscription renewal charge failed", {
      teamId: sub.teamId,
      orderId: renewalOrder.orderId,
      oenCode: charge.reason ?? "unknown",
    });
    return "failed";
  }

  await applyRenewedSubscription({
    teamId: sub.teamId,
    planId,
    billingInterval,
    orderId: renewalOrder.orderId,
    nowMs,
    seats,
    unitPrice,
  });
  await paymentRepo.updateOrderCompleted(renewalOrder.orderId);

  logger.info("subscription renewed", {
    teamId: sub.teamId,
    planId,
    billingInterval,
    orderId: renewalOrder.orderId,
  });
  return "renewed";
}

export async function processSubscriptionRenewals(
  nowMs: number = Date.now(),
): Promise<IRenewalRunResult> {
  const result: IRenewalRunResult = {
    attempted: 0,
    renewed: 0,
    failed: 0,
    downgraded: 0,
    skipped: 0,
  };

  const overdue = await teamSubscriptionRepo.listPastDueAutoRenew();

  await overdue.reduce(async (previous, sub) => {
    await previous;

    // Info: (20260807 - Luphia) 逾寬限期即停止請款並降級，避免對用戶卡片無限重試
    if (sub.currentPeriodEnd.getTime() + RENEWAL_GRACE_MS < nowMs) {
      await teamSubscriptionRepo.downgradeToFree(sub.teamId, nowMs);
      result.downgraded += 1;
      logger.warn("subscription downgraded after renewal grace period", {
        teamId: sub.teamId,
        planId: sub.planId,
      });
      return;
    }

    result.attempted += 1;
    try {
      const outcome = await renewOne(sub, nowMs);
      if (outcome === "renewed") result.renewed += 1;
      else if (outcome === "failed") result.failed += 1;
      else result.skipped += 1;
    } catch (error) {
      result.failed += 1;
      logger.error("subscription renewal errored, will retry next run", {
        teamId: sub.teamId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, Promise.resolve());

  if (overdue.length > 0) {
    logger.info("subscription renewal run", { ...result });
  }
  return result;
}

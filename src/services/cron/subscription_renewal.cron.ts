import { logger } from "@/lib/utils/logger";
import { isProduction } from "@/lib/utils/common";
import {
  CURRENCY_UNIT,
  SUBSCRIPTION_PLAN_CREDITS,
  SUBSCRIPTION_PLAN_PRICE,
} from "@/constants/price";
import { ORDER_TYPE } from "@/constants/status";
import {
  BILLING_INTERVAL,
  BillingInterval,
  TEAM_PLAN,
  TeamPlanId,
} from "@/constants/subscription_quota";
import { buildOenTransactionPayload } from "@/lib/utils/payment_helpers";
import { generatePaymentOrder } from "@/services/order.service";
import { resolvePlanId } from "@/services/spend.service";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { SystemSettingKey } from "@/constants/system_setting";
import { systemSettingService } from "@/services/system_setting.service";

/**
 * Info: (20260807 - Luphia) autoRenew 自動扣款續訂（設計書 §9 P4 待辦收尾）。
 * SubscriptionExpiry 先把過期的 autoRenew 訂閱標成 PAST_DUE（額度即刻 fail-closed），
 * 本 Worker 對 PAST_DUE + autoRenew 者以「上一張訂單的綁定卡」發起 OEN token 扣款：
 * 成功 → 建新 BILLING_SUBSCRIBE 訂單 + 套用新週期；失敗 → 留 PAST_DUE 下輪重試；
 * 逾寬限期（預設 3 天）仍未成功 → 降級 free（不無限重試扣款，避免對用戶卡片反覆請款）。
 */

const OEN_BASE_URL = isProduction()
  ? "https://payment-api.oen.tw"
  : "https://payment-api.testing.oen.tw";

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

async function renewOne(
  sub: {
    teamId: string;
    planId: string;
    latestOrderId: string | null;
  },
  nowMs: number,
): Promise<"renewed" | "failed" | "skipped"> {
  const planId = resolvePlanId(sub.planId) as Exclude<
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
  const amount =
    SUBSCRIPTION_PLAN_PRICE[planId][
      billingInterval === BILLING_INTERVAL.YEAR ? "yearly" : "monthly"
    ];

  const renewalOrder = await generatePaymentOrder(lastOrder.userId, {
    type: ORDER_TYPE.BILLING_SUBSCRIBE,
    amount,
    unit: CURRENCY_UNIT.TWD,
    credits: SUBSCRIPTION_PLAN_CREDITS[planId],
    paymentMethodId: paymentMethod.id,
    title: `iSunFA Team Subscription Renewal - ${planId} (${billingInterval})`,
    planId,
    billingInterval,
    /**
     * Info: (20260814 - Luphia) teamId 必須是頂層欄位：generatePaymentOrder 會把
     * params.data 沉一層到 order.data.data，而履行端讀的是 order.data.teamId。
     * 續訂雖然由本函式自行套用方案（不靠訂單欄位），但 webhook 若在完成前先到，
     * 讀不到 teamId 就會把這張單標記為「已扣款未履行」。
     */
    teamId: sub.teamId,
    data: { renewal: true },
  });
  const orderData = {
    teamId: sub.teamId,
    planId,
    billingInterval,
    renewal: true,
    paymentMethodId: paymentMethod.id,
    // Info: (20260807 - Luphia) IOenOrderData.amount 為字串（金額以字串傳輸避免浮點誤差）
    amount: String(amount),
    credits: SUBSCRIPTION_PLAN_CREDITS[planId],
  };

  const paymentTransaction =
    await paymentRepo.createPaymentTransactionAndUpdateOrder(
      lastOrder.userId,
      paymentMethod.id,
      renewalOrder.orderId,
      BigInt(amount),
      orderData,
      RENEWAL_AUTH_MARKER,
    );

  const pmData = paymentMethod.data as Record<string, string> | undefined;

  // Info: (20260809 - Luphia) 金流憑證以資料庫設定為準，env 為 fallback；每次續訂重新解析，輪替後立即生效
  const oenAccessToken = await systemSettingService.get(
    SystemSettingKey.OEN_ACCESS_TOKEN,
  );
  // Info: (20260811 - Luphia) 與綁卡路徑取同一個設定值，避免兩邊商店代號不一致
  const oenMerchantId = await systemSettingService.get(
    SystemSettingKey.OEN_MERCHANT_ID,
  );

  const oenRes = await fetch(`${OEN_BASE_URL}/token/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${oenAccessToken}`,
    },
    body: JSON.stringify(
      buildOenTransactionPayload(
        { id: user.id, name: user.name ?? null },
        pmData,
        renewalOrder.orderId,
        amount,
        orderData,
        paymentMethod.token,
        oenMerchantId ?? "",
      ),
    ),
  });
  const oenData = await oenRes.json();

  if (oenData.code !== "S0000" && !oenRes.ok) {
    await paymentRepo.failPaymentTransactionAndOrder(
      paymentTransaction.id,
      renewalOrder.orderId,
      orderData,
      oenData,
      RENEWAL_AUTH_MARKER,
    );
    logger.error("subscription renewal charge failed", {
      teamId: sub.teamId,
      orderId: renewalOrder.orderId,
      oenCode: oenData.code,
    });
    return "failed";
  }

  await paymentRepo.completePaymentTransactionAndOrder(
    paymentTransaction.id,
    renewalOrder.orderId,
    lastOrder.userId,
    user.name || "Unknown",
    BigInt(amount),
    SUBSCRIPTION_PLAN_CREDITS[planId],
    orderData,
    oenData,
    RENEWAL_AUTH_MARKER,
  );
  await teamSubscriptionRepo.applyTeamSubscription({
    teamId: sub.teamId,
    planId,
    billingInterval,
    orderId: renewalOrder.orderId,
    nowMs,
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

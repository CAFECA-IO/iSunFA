import { Order } from "@/generated";
import {
  SUBSCRIPTION_PLAN_CREDITS,
  SUBSCRIPTION_PLAN_PRICE,
  CURRENCY_UNIT,
} from "@/constants/price";
import { ORDER_TYPE } from "@/constants/status";
import { TeamRole } from "@/constants/team";
import {
  BILLING_INTERVAL,
  BillingInterval,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
  TeamPlanId,
  TeamSubscriptionStatus,
} from "@/constants/subscription_quota";
import {
  getResetAt5h,
  getResetAtWeek,
  getWindowKey5h,
  getWindowKeyWeek,
} from "@/lib/quota/window";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import type {
  IQuotaStatus,
  ITeamSubscriptionView,
} from "@/interfaces/team_wallet";
import {
  resolveEffectivePlanId,
  resolvePlanId,
} from "@/services/spend.service";
import { generatePaymentOrder } from "@/services/order.service";
import { assertTeamMember } from "@/services/team_wallet_access.guard";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { paymentRepo } from "@/repositories/payment.repo";

/**
 * Info: (20260807 - Luphia) 團隊訂閱 Service（設計書 §7 GET/PUT /subscription）。
 * GET 回傳方案、計費週期、雙視窗剩餘額度與 resetAt，以及費思費率
 * （定價揭露 §5.3：數字與 env 同源，前端插值渲染、嚴禁寫死）。
 */

function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

async function guarded<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
  }
}

async function buildQuotaStatus(
  teamId: string,
  planId: TeamPlanId,
  nowSec: number,
): Promise<IQuotaStatus> {
  // Info: (20260809 - Luphia) 額度為系統設定，自 DB 取得
  const quota = await subscriptionPlanQuotaRepo.resolveQuota(planId);
  const { used5h, usedWeek } = await teamQuotaUsageRepo.sumWindowUsage(
    teamId,
    getWindowKey5h(nowSec),
    getWindowKeyWeek(nowSec),
  );
  return {
    quota5h: {
      limit: String(quota.per5h),
      used: used5h.toString(),
      resetAt: getResetAt5h(nowSec),
    },
    quotaWeek: {
      limit: String(quota.perWeek),
      used: usedWeek.toString(),
      resetAt: getResetAtWeek(nowSec),
    },
  };
}

export async function getTeamSubscriptionView(params: {
  userId: string;
  teamId: string;
  nowSec: number;
}): Promise<ITeamSubscriptionView> {
  const { userId, teamId, nowSec } = params;

  return guarded(async () => {
    await assertTeamMember(userId, teamId);

    const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
    // Info: (20260807 - Luphia) 顯示「有效」方案：過期或非 ACTIVE 一律呈現 free，與扣費側一致
    const planId = resolveEffectivePlanId(subscription, nowSec);
    const quota = await buildQuotaStatus(teamId, planId, nowSec);
    // Info: (20260809 - Luphia) 費率為系統設定，自 DB 取得
    const billing = await faithBillingSettingRepo.resolveSetting();

    return {
      teamId,
      planId,
      status: (subscription?.status ??
        TEAM_SUBSCRIPTION_STATUS.ACTIVE) as TeamSubscriptionStatus,
      currentPeriodStart: subscription
        ? Math.floor(subscription.currentPeriodStart.getTime() / 1000)
        : 0,
      currentPeriodEnd: subscription
        ? Math.floor(subscription.currentPeriodEnd.getTime() / 1000)
        : 0,
      autoRenew: subscription?.autoRenew ?? false,
      quota,
      faithTokensPerCredit: billing.tokensPerCredit,
    };
  });
}

/**
 * Info: (20260807 - Luphia) 變更方案（設計書 §7 PUT /subscription，OWNER 專屬）。
 * free 為免付款直接降級（當期額度立即按新方案計，不追溯扣款）；
 * 付費方案建立 BILLING_SUBSCRIBE 訂單（data 帶 teamId），付款成功後由
 * processOenPayment / checkout 履行路徑套用訂閱。
 */
export async function changeTeamSubscription(params: {
  userId: string;
  teamId: string;
  planId: TeamPlanId;
  billingInterval: BillingInterval;
  paymentMethodId?: string;
  nowMs: number;
}) {
  const { userId, teamId, planId, billingInterval, paymentMethodId, nowMs } =
    params;

  return guarded(async () => {
    const member = await assertTeamMember(userId, teamId);
    if (member.role !== TeamRole.OWNER) {
      throw toApiError(API_ERRORS.TW_WALLET_FORBIDDEN);
    }

    if (planId === TEAM_PLAN.FREE) {
      await teamSubscriptionRepo.downgradeToFree(teamId, nowMs);
      return { orderId: null, planId };
    }

    if (!paymentMethodId) {
      throw toApiError(API_ERRORS.VL_SCHEMA_ERROR);
    }

    const price =
      SUBSCRIPTION_PLAN_PRICE[planId][
        billingInterval === BILLING_INTERVAL.YEAR ? "yearly" : "monthly"
      ];
    return generatePaymentOrder(userId, {
      type: ORDER_TYPE.BILLING_SUBSCRIBE,
      amount: price,
      unit: CURRENCY_UNIT.TWD,
      credits: SUBSCRIPTION_PLAN_CREDITS[planId],
      paymentMethodId,
      title: `iSunFA Team Subscription - ${planId} (${billingInterval})`,
      planId,
      billingInterval,
      data: { teamId, planId, billingInterval },
    });
  });
}

/**
 * Info: (20260807 - Luphia) 綁卡直扣（checkout）路徑的訂閱履行：
 * 套用方案後標記訂單 COMPLETED。webhook 路徑由 processOenPayment 於交易內原子處理。
 */
export async function fulfillTeamSubscriptionOrder(
  order: Order,
  nowMs: number,
): Promise<void> {
  return guarded(async () => {
    if (order.type !== ORDER_TYPE.BILLING_SUBSCRIBE) {
      throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
    }
    const data = order.data as {
      teamId?: string;
      planId?: string;
      billingInterval?: BillingInterval;
    } | null;
    if (!data?.teamId || !data.planId) {
      throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
    }

    await teamSubscriptionRepo.applyTeamSubscription({
      teamId: data.teamId,
      planId: resolvePlanId(data.planId),
      billingInterval: data.billingInterval ?? BILLING_INTERVAL.MONTH,
      orderId: order.id,
      nowMs,
    });
    await paymentRepo.updateOrderCompleted(order.id);
  });
}

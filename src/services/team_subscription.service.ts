import { Order } from "@/generated";
import { SUBSCRIPTION_PLAN_PRICE, CURRENCY_UNIT } from "@/constants/price";
import { ORDER_TYPE } from "@/constants/status";
import { TeamRole } from "@/constants/team";
import {
  DEFAULT_FREE_PLAN_MAX_MEMBERS,
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
  IAccountBookQuotaView,
  IQuotaStatus,
  ITeamQuotaTotals,
  ITeamSubscriptionView,
} from "@/interfaces/team_wallet";
import {
  resolveEffectivePlanId,
  resolvePlanId,
} from "@/services/spend.service";
import { generatePaymentOrder } from "@/services/order.service";
import { assertTeamMember } from "@/services/team_wallet_access.guard";
import {
  assertAccountBookMember,
  mapServiceError,
} from "@/services/account_book_access.guard";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamRepo } from "@/repositories/team.repo";
import { SystemSettingKey } from "@/constants/system_setting";
import { systemSettingService } from "@/services/system_setting.service";
import { resolveSubscriptionAmount } from "@/lib/billing/seat_billing";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";

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

/**
 * Info: (20260814 - Luphia) 額度狀態是**該成員自己的**（一人一池，產品拍板 20260814）：
 * 畫面顯示的剩餘量必須與扣費側同一套算法，否則用戶會看到別人用掉的量算在自己頭上。
 */
async function buildQuotaStatus(
  teamId: string,
  userId: string,
  planId: TeamPlanId,
  nowSec: number,
): Promise<IQuotaStatus> {
  // Info: (20260809 - Luphia) 額度為系統設定，自 DB 取得
  const quota = await subscriptionPlanQuotaRepo.resolveQuota(planId);
  const { used5h, usedWeek } = await teamQuotaUsageRepo.sumWindowUsage(
    teamId,
    userId,
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

/**
 * Info: (20260817 - Luphia) 全隊用量合計（PR #6652 第二輪 C-1）。
 *
 * `limit` 是「每人上限 × 目前人數」：額度一人一池，團隊買到的總量就是這個乘積。
 * 用當下人數而非 `subscription.seats`——後者是唯寫欄位（第二輪 C-7），對不了帳。
 *
 * 只回合計，不回逐人明細（產品決定 20260817）。
 */
async function buildTeamQuotaTotals(
  teamId: string,
  planId: TeamPlanId,
  nowSec: number,
): Promise<ITeamQuotaTotals> {
  const [quota, memberCount, usage] = await Promise.all([
    subscriptionPlanQuotaRepo.resolveQuota(planId),
    teamRepo.countMembers(teamId),
    teamQuotaUsageRepo.sumTeamWindowUsage(
      teamId,
      getWindowKey5h(nowSec),
      getWindowKeyWeek(nowSec),
    ),
  ]);

  // Info: (20260817 - Luphia) 至少 1：人數為 0 時分母不能是 0，否則進度條會變成 NaN
  const seats = Math.max(1, memberCount);

  return {
    memberCount,
    quota5h: {
      limit: String(BigInt(quota.per5h) * BigInt(seats)),
      used: usage.used5h.toString(),
      resetAt: getResetAt5h(nowSec),
    },
    quotaWeek: {
      limit: String(BigInt(quota.perWeek) * BigInt(seats)),
      used: usage.usedWeek.toString(),
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
    const member = await assertTeamMember(userId, teamId);

    const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
    // Info: (20260807 - Luphia) 顯示「有效」方案：過期或非 ACTIVE 一律呈現 free，與扣費側一致
    const planId = resolveEffectivePlanId(subscription, nowSec);
    const quota = await buildQuotaStatus(teamId, userId, planId, nowSec);

    /**
     * Info: (20260818 - Luphia) 全隊合計**限管理職**（OWNER / ADMIN，產品決定 20260818）。
     *
     * 這個數字回答的是「團隊買的額度被用掉多少」，而動用團隊錢包的是管理職——
     * ADMIN 花得到團隊的錢，就該看得到團隊消耗了多少。
     *
     * 一般成員看不到：對他們沒有對應的問題，卻會透露團隊整體的使用強度——
     * 額度是一人一池，總和加上人數就能推估同事的平均用量。
     *
     * 非管理職直接**不查**而不是查了再丟掉：查了再丟掉的版本，
     * 下一個人在別處重用這個函式時就會把它一起回出去。
     */
    const isManager =
      member.role === TeamRole.OWNER || member.role === TeamRole.ADMIN;
    const teamTotals = isManager
      ? await buildTeamQuotaTotals(teamId, planId, nowSec)
      : undefined;
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
      teamTotals,
      faithTokensPerCredit: billing.tokensPerCredit,
    };
  });
}

/**
 * Info: (20260813 - Luphia) 帳本情境下的額度檢視（費思常駐儀表用）。
 *
 * 與 getTeamSubscriptionView 的差別只在入口：這裡以 accountBookId 推導團隊
 * （沿用 assertAccountBookMember 授權收斂點，與費思扣費同一條推導），
 * 並附上成員自己的分配點數餘額——拆帳上線後（§5.4）額度見底會自動接續扣錢包，
 * 只顯示訂閱額度會讓用戶以為 0% 就等於不能用。
 */
export async function getAccountBookQuotaView(params: {
  userId: string;
  accountBookId: string;
  nowSec: number;
}): Promise<IAccountBookQuotaView> {
  const { userId, accountBookId, nowSec } = params;

  const accountBook = await (async () => {
    try {
      return await assertAccountBookMember(accountBookId, userId);
    } catch (error) {
      throw toApiError(mapServiceError(error));
    }
  })();

  return guarded(async () => {
    const teamId = accountBook.teamId;
    const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
    const planId = resolveEffectivePlanId(subscription, nowSec);
    const quota = await buildQuotaStatus(teamId, userId, planId, nowSec);
    const allocation = await teamWalletRepo.getAllocation(teamId, userId);

    return {
      teamId,
      planId,
      quota,
      allocationBalance: (allocation?.balance ?? BigInt(0)).toString(),
    };
  });
}

/**
 * Info: (20260807 - Luphia) 變更方案（設計書 §7 PUT /subscription，OWNER 專屬）。
 * free 為免付款直接降級（當期額度立即按新方案計，不追溯扣款）；
 * 付費方案建立 BILLING_SUBSCRIBE 訂單（data 帶 teamId），付款成功後由
 * processOenPayment / checkout 履行路徑套用訂閱。
 */
/**
 * Info: (20260814 - Luphia) 生效中的免費版人數上限（PR #6652 第二輪 B-4）。
 *
 * 與記憶保留天數同一套作法：正式值存於 DB 的系統設定（ADR 017，可後台調整），
 * 讀不到或值不合法時退回程式內的 fail-safe 預設。所有需要這個數字的地方
 * 都必須經過這裡，不得直接引用常數——否則後台調整後，擋人的地方與方案頁的標示
 * 會各用一個數字。
 */
export async function resolveFreePlanMaxMembers(): Promise<number> {
  try {
    const raw = await systemSettingService.get(
      SystemSettingKey.FREE_PLAN_MAX_MEMBERS,
    );
    const parsed = /^\d+$/.test((raw ?? "").trim())
      ? Number((raw ?? "").trim())
      : NaN;
    // Info: (20260814 - Luphia) 0 或負數等於「免費版不能有任何成員」，那不是合理設定
    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : DEFAULT_FREE_PLAN_MAX_MEMBERS;
  } catch (error) {
    console.error("Failed to resolve free plan member cap:", error);
    return DEFAULT_FREE_PLAN_MAX_MEMBERS;
  }
}

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

    /**
     * Info: (20260814 - Luphia) 席次計價（規範 P2）：金額 = 單價 × 團隊人數，**由 server 計算**。
     * 前端只負責顯示；採信前端送來的總額等於把價格交給呼叫端決定。
     */
    const unitPrice =
      SUBSCRIPTION_PLAN_PRICE[planId][
        billingInterval === BILLING_INTERVAL.YEAR ? "yearly" : "monthly"
      ];
    const seats = await teamRepo.countMembers(teamId);
    const amount = resolveSubscriptionAmount(unitPrice, seats);

    return generatePaymentOrder(userId, {
      type: ORDER_TYPE.BILLING_SUBSCRIBE,
      amount,
      unit: CURRENCY_UNIT.TWD,
      /**
       * Info: (20260814 - Luphia) 訂閱**不發點數**：履行路徑只寫 TeamSubscription，
       * 不 mint 鏈上點數、也不入團隊池（設計書 §7）。原本帶 SUBSCRIPTION_PLAN_CREDITS
       * 進來，付款畫面與收據就會承諾一筆從未發放的點數（「獲得 1,500 點」）。
       * 訂閱買到的是額度視窗，額度不是點數。
       */
      credits: 0,
      paymentMethodId,
      title: `iSunFA Team Subscription - ${planId} (${billingInterval}) x${Math.max(1, seats)}`,
      planId,
      billingInterval,
      teamId,
      seats: Math.max(1, seats),
      unitPrice,
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
      seats?: number;
      unitPrice?: number;
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
      seats: data.seats,
      unitPrice: data.unitPrice,
    });
    await paymentRepo.updateOrderCompleted(order.id);
  });
}

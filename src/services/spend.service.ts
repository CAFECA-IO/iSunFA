import {
  BillableFeatureCode,
  SPEND_SOURCE,
  SUBSCRIPTION_QUOTA_BY_PLAN,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
  TeamPlanId,
  WALLET_OP_OUTCOME,
} from "@/constants/subscription_quota";
import {
  getResetAt5h,
  getResetAtWeek,
  getWindowKey5h,
  getWindowKeyWeek,
} from "@/lib/quota/window";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import type {
  IQuotaExceededPayload,
  ISpendResult,
} from "@/interfaces/team_wallet";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";

/**
 * Info: (20260807 - Luphia) 扣費管線（設計書 §5）——所有計費功能的單一入口。
 * 三層順序：訂閱額度（免簽章）→ 成員分配點數（免簽章）→ 皆不足丟 QuotaExceededError，
 * 由 API 層回 402 並引導個人錢包簽章流程。禁止任何功能繞過本管線自行扣帳。
 */

export interface ISpendParams {
  teamId: string;
  userId: string;
  featureCode: BillableFeatureCode;
  cost: bigint;
  idempotencyKey: string;
  // Info: (20260807 - Luphia) 時間由呼叫端注入（epoch 秒），維持視窗數學的決定論與可測性
  nowSec: number;
}

export interface IRefundParams {
  idempotencyKey: string;
  operatorUserId: string;
}

export interface IRefundResult {
  refunded: boolean;
  source: (typeof SPEND_SOURCE)[keyof typeof SPEND_SOURCE] | null;
}

/**
 * Info: (20260807 - Luphia) 402 專用錯誤：攜帶三條出路所需的完整資訊（設計書 §5 payload）
 */
export class QuotaExceededError extends ApiError {
  public data: IQuotaExceededPayload;

  constructor(def: IErrorDef, data: IQuotaExceededPayload) {
    super(def.code, def.message, def.status);
    this.name = "QuotaExceededError";
    this.data = data;
  }
}

function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

/**
 * Info: (20260807 - Luphia) 方案解析採 fail-closed：查無訂閱或未知 planId 一律視為 free，
 * 絕不因資料異常放大額度。
 */
export function resolvePlanId(planId: string | undefined): TeamPlanId {
  const known = Object.values(TEAM_PLAN) as string[];
  if (planId && known.includes(planId)) return planId as TeamPlanId;
  return TEAM_PLAN.FREE;
}

/**
 * Info: (20260807 - Luphia) 有效方案 = 方案 ID + 訂閱狀態 + 計費週期三者同時成立，
 * 缺一即 fail-closed 到 free——即使續訂 Worker 尚未跑到，過期訂閱也不會多放一點額度。
 */
export function resolveEffectivePlanId(
  subscription: {
    planId: string;
    status: string;
    currentPeriodEnd: Date;
  } | null,
  nowSec: number,
): TeamPlanId {
  if (!subscription) return TEAM_PLAN.FREE;
  const planId = resolvePlanId(subscription.planId);
  if (planId === TEAM_PLAN.FREE) return TEAM_PLAN.FREE;
  const isActive = subscription.status === TEAM_SUBSCRIPTION_STATUS.ACTIVE;
  const inPeriod =
    Math.floor(subscription.currentPeriodEnd.getTime() / 1000) >= nowSec;
  return isActive && inPeriod ? planId : TEAM_PLAN.FREE;
}

/**
 * Info: (20260807 - Luphia) Service 層錯誤邊界：ApiError 原樣上拋，
 * 其餘（含 Prisma 原始錯誤）一律包裝，不讓底層錯誤細節噴到前端。
 */
async function guarded<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
  }
}

export async function spendCredits(
  params: ISpendParams,
): Promise<ISpendResult> {
  const { teamId, userId, featureCode, cost, idempotencyKey, nowSec } = params;

  // Info: (20260807 - Luphia) Fail Fast：非正整數的扣款金額直接凍結
  if (typeof cost !== "bigint" || cost <= BigInt(0)) {
    throw toApiError(API_ERRORS.TW_INVALID_SPEND_AMOUNT);
  }

  return guarded(async () => {
    const member = await teamRepo.getTeamMember(userId, teamId);
    if (!member) throw toApiError(API_ERRORS.TW_NOT_TEAM_MEMBER);

    // Info: (20260807 - Luphia) 冪等重放：任一層已入帳即直接回傳，不重複扣款
    const replayedUsage =
      await teamQuotaUsageRepo.findByIdempotencyKey(idempotencyKey);
    if (replayedUsage) {
      return {
        source: SPEND_SOURCE.SUBSCRIPTION_QUOTA,
        amount: replayedUsage.amount.toString(),
        idempotencyKey,
      };
    }
    const replayedLedger =
      await teamWalletRepo.findLedgerByIdempotencyKey(idempotencyKey);
    if (replayedLedger) {
      return {
        source: SPEND_SOURCE.TEAM_ALLOCATION,
        amount: (-replayedLedger.amount).toString(),
        idempotencyKey,
      };
    }

    // Info: (20260807 - Luphia) 第一層：訂閱額度（雙視窗皆須容納本次 cost）
    const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
    const quota =
      SUBSCRIPTION_QUOTA_BY_PLAN[resolveEffectivePlanId(subscription, nowSec)];
    const windowKey5h = getWindowKey5h(nowSec);
    const windowKeyWeek = getWindowKeyWeek(nowSec);
    const { used5h, usedWeek } = await teamQuotaUsageRepo.sumWindowUsage(
      teamId,
      windowKey5h,
      windowKeyWeek,
    );
    const limit5h = BigInt(quota.per5h);
    const limitWeek = BigInt(quota.perWeek);

    if (used5h + cost <= limit5h && usedWeek + cost <= limitWeek) {
      const { usage } = await teamQuotaUsageRepo.createUsage({
        teamId,
        userId,
        featureCode,
        amount: cost,
        windowKey5h,
        windowKeyWeek,
        idempotencyKey,
      });
      return {
        source: SPEND_SOURCE.SUBSCRIPTION_QUOTA,
        amount: usage.amount.toString(),
        idempotencyKey,
      };
    }

    // Info: (20260807 - Luphia) 第二層：成員分配點數（條件扣款，負餘額零容忍）
    const consumed = await teamWalletRepo.consumeAllocation({
      teamId,
      userId,
      amount: cost,
      featureCode,
      idempotencyKey,
    });
    if (
      consumed.outcome === WALLET_OP_OUTCOME.OK ||
      consumed.outcome === WALLET_OP_OUTCOME.DUPLICATE
    ) {
      return {
        source: SPEND_SOURCE.TEAM_ALLOCATION,
        amount: cost.toString(),
        idempotencyKey,
      };
    }
    if (consumed.outcome === WALLET_OP_OUTCOME.FROZEN) {
      throw toApiError(API_ERRORS.TW_WALLET_FROZEN);
    }

    // Info: (20260807 - Luphia) 第三層：皆不足 → 402，payload 附三條出路的完整資訊
    const allocation = await teamWalletRepo.getAllocation(teamId, userId);
    const payload: IQuotaExceededPayload = {
      exceeded: used5h + cost > limit5h ? "PER_5H" : "PER_WEEK",
      quota5h: {
        limit: limit5h.toString(),
        used: used5h.toString(),
        resetAt: getResetAt5h(nowSec),
      },
      quotaWeek: {
        limit: limitWeek.toString(),
        used: usedWeek.toString(),
        resetAt: getResetAtWeek(nowSec),
      },
      allocationBalance: (allocation?.balance ?? BigInt(0)).toString(),
      options: ["WAIT_RESET", "USE_PERSONAL_WALLET"],
    };
    throw new QuotaExceededError(API_ERRORS.TW_QUOTA_EXCEEDED, payload);
  });
}

/**
 * Info: (20260807 - Luphia) 失敗補償（設計書 §5.2）：依原始扣款來源反向沖銷。
 * 查無原始扣款回 refunded = false（呼叫端 Worker 據此判斷 no-op），不丟錯誤；
 * 補償本身冪等（refund: 前綴鍵），Worker 重試不會重複退款。
 */
export async function refundCredits(
  params: IRefundParams,
): Promise<IRefundResult> {
  const { idempotencyKey, operatorUserId } = params;

  return guarded(async () => {
    const usage = await teamQuotaUsageRepo.findByIdempotencyKey(idempotencyKey);
    if (usage && usage.amount > BigInt(0)) {
      await teamQuotaUsageRepo.createUsage({
        teamId: usage.teamId,
        userId: usage.userId,
        featureCode: usage.featureCode,
        amount: -usage.amount,
        // Info: (20260807 - Luphia) 退款寫回「原視窗」，確保視窗 SUM 與實際用量一致
        windowKey5h: usage.windowKey5h,
        windowKeyWeek: usage.windowKeyWeek,
        idempotencyKey: `refund:${idempotencyKey}`,
      });
      return { refunded: true, source: SPEND_SOURCE.SUBSCRIPTION_QUOTA };
    }

    const refunded = await teamWalletRepo.refundAllocation(
      idempotencyKey,
      operatorUserId,
    );
    if (
      refunded.outcome === WALLET_OP_OUTCOME.OK ||
      refunded.outcome === WALLET_OP_OUTCOME.DUPLICATE
    ) {
      return { refunded: true, source: SPEND_SOURCE.TEAM_ALLOCATION };
    }
    if (refunded.outcome === WALLET_OP_OUTCOME.FROZEN) {
      throw toApiError(API_ERRORS.TW_WALLET_FROZEN);
    }

    return { refunded: false, source: null };
  });
}

export interface ISettleParams {
  idempotencyKey: string;
  actualCost: bigint;
  operatorUserId: string;
}

export interface ISettleResult {
  settled: boolean;
  source: (typeof SPEND_SOURCE)[keyof typeof SPEND_SOURCE] | null;
  held: string;
  charged: string;
  refunded: string;
}

/**
 * Info: (20260807 - Luphia) 預扣—結算（設計書 §5.3 步驟 3）：
 * 依實際用量退還「預扣 - 實耗」的差額，結算鍵 settle:{原鍵} 天然冪等。
 * hold 公式保證 actual ≤ held（只退不補）；若因估算異常出現 actual > held，
 * 收斂為不退款（絕不在結算階段追加扣款，避免二次不足的複雜態）。
 */
export async function settleSpend(
  params: ISettleParams,
): Promise<ISettleResult> {
  const { idempotencyKey, actualCost, operatorUserId } = params;

  if (typeof actualCost !== "bigint" || actualCost <= BigInt(0)) {
    throw toApiError(API_ERRORS.TW_INVALID_SPEND_AMOUNT);
  }

  return guarded(async () => {
    const usage = await teamQuotaUsageRepo.findByIdempotencyKey(idempotencyKey);
    if (usage && usage.amount > BigInt(0)) {
      const held = usage.amount;
      const refund =
        held - actualCost > BigInt(0) ? held - actualCost : BigInt(0);
      if (refund > BigInt(0)) {
        await teamQuotaUsageRepo.createUsage({
          teamId: usage.teamId,
          userId: usage.userId,
          featureCode: usage.featureCode,
          amount: -refund,
          windowKey5h: usage.windowKey5h,
          windowKeyWeek: usage.windowKeyWeek,
          idempotencyKey: `settle:${idempotencyKey}`,
        });
      }
      return {
        settled: true,
        source: SPEND_SOURCE.SUBSCRIPTION_QUOTA,
        held: held.toString(),
        charged: (held - refund).toString(),
        refunded: refund.toString(),
      };
    }

    const ledger =
      await teamWalletRepo.findLedgerByIdempotencyKey(idempotencyKey);
    if (ledger && ledger.amount < BigInt(0)) {
      const held = -ledger.amount;
      const refund =
        held - actualCost > BigInt(0) ? held - actualCost : BigInt(0);
      if (refund > BigInt(0)) {
        const result = await teamWalletRepo.refundAllocationPartial(
          idempotencyKey,
          refund,
          operatorUserId,
        );
        if (result.outcome === WALLET_OP_OUTCOME.FROZEN) {
          throw toApiError(API_ERRORS.TW_WALLET_FROZEN);
        }
      }
      return {
        settled: true,
        source: SPEND_SOURCE.TEAM_ALLOCATION,
        held: held.toString(),
        charged: (held - refund).toString(),
        refunded: refund.toString(),
      };
    }

    return {
      settled: false,
      source: null,
      held: "0",
      charged: "0",
      refunded: "0",
    };
  });
}

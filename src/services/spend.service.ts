import {
  BillableFeatureCode,
  resolveSpendPriority,
  type SpendSource,
  QUOTA_EXCEEDED_OPTION,
  QUOTA_WINDOW,
  SPEND_SOURCE,
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
import {
  resolveQuotaAvailable,
  splitRefund,
  splitSpend,
} from "@/lib/quota/spend_split";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import type {
  IQuotaExceededPayload,
  ISpendResult,
} from "@/interfaces/team_wallet";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { teamWalletRepo } from "@/repositories/team_wallet.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";

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
  /**
   * Info: (20260813 - Luphia) 是否允許「預扣封頂」（設計書 §5.4）。
   *
   * `true` 供**按用量計量**的功能使用（費思、碳盤查）：餘額不足全額時先放行、
   * 結算階段再追補差額，因此少扣不會變成少收。
   *
   * 固定價格的消費（分析報告、物流查詢等訂單）必須傳 `false`：它們沒有結算步驟，
   * 封頂扣款會讓一張 10 點的訂單以 3 點成交而無人補收——那是帳務上的漏，
   * 不是體驗上的寬容。
   *
   * 刻意**不給預設值**：兩種答案各自都會在對方的情境釀成帳務錯誤，
   * 沒有一個「安全的預設」可選。新增呼叫點時必須先想清楚有沒有結算步驟。
   */
  allowPartial: boolean;
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

interface ISpendRecords {
  quotaHeld: bigint;
  walletHeld: bigint;
  held: bigint;
  /**
   * Info: (20260814 - Luphia) 這把鍵**已經退還**的金額（settle: 與 refund: 兩把衍生鍵的合計）。
   * 沒有這兩個欄位，退款只會檢查「同一把退款鍵是否重複」，而結算退差額用的是
   * `settle:`、失敗補償用的是 `refund:`——兩把不同的鍵，於是「先部分退、再全額退」
   * 兩次都會通過，憑空多退出一筆額度。
   */
  quotaRefunded: bigint;
  walletRefunded: bigint;
  // Info: (20260814 - Luphia) 尚未退還的淨額：<= 0 代表這筆消耗已經全數退乾淨
  outstanding: bigint;
  // Info: (20260813 - Luphia) 額度用量列的視窗 key：退款與追補必須寫回同一視窗
  windowKey5h: number | null;
  windowKeyWeek: number | null;
  teamId: string | null;
  userId: string | null;
  featureCode: string | null;
}

/**
 * Info: (20260813 - Luphia) 讀出同一把冪等鍵在兩邊的入帳金額（拆帳後兩邊可能同時存在）。
 * 只認「正向消耗」：額度列的負數是退款、錢包分錄的正數是回補，兩者都不是預扣。
 */
async function readSpendRecords(
  idempotencyKey: string,
): Promise<ISpendRecords> {
  const [usage, ledger, settleUsage, refundUsage, settleLedger, refundLedger] =
    await Promise.all([
      teamQuotaUsageRepo.findByIdempotencyKey(idempotencyKey),
      teamWalletRepo.findLedgerByIdempotencyKey(idempotencyKey),
      // Info: (20260814 - Luphia) 兩把衍生退款鍵都要讀：結算退差額用 settle:、失敗補償用 refund:
      teamQuotaUsageRepo.findByIdempotencyKey(`settle:${idempotencyKey}`),
      teamQuotaUsageRepo.findByIdempotencyKey(`refund:${idempotencyKey}`),
      teamWalletRepo.findLedgerByIdempotencyKey(`settle:${idempotencyKey}`),
      teamWalletRepo.findLedgerByIdempotencyKey(`refund:${idempotencyKey}`),
    ]);
  const quotaHeld =
    usage && usage.amount > BigInt(0) ? usage.amount : BigInt(0);
  const walletHeld =
    ledger && ledger.amount < BigInt(0) ? -ledger.amount : BigInt(0);
  // Info: (20260814 - Luphia) 額度退款列為負數、錢包退款分錄為正數，取絕對值合計
  const quotaRefunded = [settleUsage, refundUsage].reduce(
    (sum, row) => (row && row.amount < BigInt(0) ? sum + -row.amount : sum),
    BigInt(0),
  );
  const walletRefunded = [settleLedger, refundLedger].reduce(
    (sum, row) => (row && row.amount > BigInt(0) ? sum + row.amount : sum),
    BigInt(0),
  );
  return {
    quotaHeld,
    walletHeld,
    held: quotaHeld + walletHeld,
    quotaRefunded,
    walletRefunded,
    outstanding: quotaHeld + walletHeld - quotaRefunded - walletRefunded,
    windowKey5h: usage?.windowKey5h ?? null,
    windowKeyWeek: usage?.windowKeyWeek ?? null,
    // Info: (20260813 - Luphia) Ledger 掛在 teamWalletId 之下、沒有 teamId 欄位，故 teamId 只能取自 usage
    teamId: usage?.teamId ?? null,
    userId: usage?.userId ?? ledger?.targetUserId ?? null,
    featureCode: usage?.featureCode ?? ledger?.featureCode ?? null,
  };
}

/**
 * Info: (20260813 - Luphia) 扣款來源的標示：兩邊都動過即 MIXED。
 * 呼叫端（訂單備註、point_history）據此說明這筆消費從哪裡扣的。
 */
function toSpendResult(
  idempotencyKey: string,
  quotaAmount: bigint,
  allocationAmount: bigint,
  replayed = false,
): ISpendResult {
  const source =
    quotaAmount > BigInt(0) && allocationAmount > BigInt(0)
      ? SPEND_SOURCE.MIXED
      : allocationAmount > BigInt(0)
        ? SPEND_SOURCE.TEAM_ALLOCATION
        : SPEND_SOURCE.SUBSCRIPTION_QUOTA;
  return {
    source,
    amount: (quotaAmount + allocationAmount).toString(),
    quotaAmount: quotaAmount.toString(),
    allocationAmount: allocationAmount.toString(),
    idempotencyKey,
    replayed,
  };
}

/**
 * Info: (20260813 - Luphia) 402 payload（設計書 §5）。
 * exceeded 取「剩餘量較少」的那個視窗：拆帳後 402 只在兩個來源同時見底時才丟出，
 * 此時要告訴用戶的是「哪一層先恢復」——報錯視窗會讓他白等一場。
 */
function buildQuotaExceededPayload(input: {
  nowSec: number;
  limit5h: bigint;
  used5h: bigint;
  limitWeek: bigint;
  usedWeek: bigint;
  walletBalance: bigint;
}): IQuotaExceededPayload {
  const { nowSec, limit5h, used5h, limitWeek, usedWeek, walletBalance } = input;
  const remaining5h = limit5h - used5h;
  const remainingWeek = limitWeek - usedWeek;
  return {
    exceeded:
      remaining5h <= remainingWeek
        ? QUOTA_WINDOW.PER_5H
        : QUOTA_WINDOW.PER_WEEK,
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
    allocationBalance: walletBalance.toString(),
    options: [
      QUOTA_EXCEEDED_OPTION.WAIT_RESET,
      QUOTA_EXCEEDED_OPTION.USE_PERSONAL_WALLET,
    ],
  };
}

/**
 * Info: (20260813 - Luphia) 無帳本情境的付款團隊解析（設計書 §5.6）。
 *
 * AI 分析與物流查詢的訂單不帶帳本，付款團隊只能來自用戶：
 * 只屬一個團隊時直接用它（沒有歧義，不必多問一步）；屬多個團隊而未指定，
 * 一律回 TW_TEAM_AMBIGUOUS 讓前端出選單——猜錯的後果是某個團隊莫名其妙被扣額度。
 *
 * 指定了 teamId 就照用（成員資格由 spendCredits 的 guard 驗證），此處不重複查權限。
 */
export async function resolvePayingTeamId(
  userId: string,
  requestedTeamId?: string,
): Promise<string> {
  if (requestedTeamId) return requestedTeamId;

  return guarded(async () => {
    const teams = await teamRepo.listMemberTeam(userId);
    if (teams.length === 1) return teams[0].id;
    if (teams.length === 0) throw toApiError(API_ERRORS.TW_NOT_TEAM_MEMBER);
    throw toApiError(API_ERRORS.TW_TEAM_AMBIGUOUS);
  });
}

/**
 * Info: (20260814 - Luphia) 同一把鍵最多允許的重試輪數。上界存在的理由是止血：
 * 正常重試不會逼近它，而無上界的迴圈在資料異常時會一直往下探鍵。
 */
const MAX_RETRY_ROUNDS = 20;

export async function spendCredits(
  params: ISpendParams,
): Promise<ISpendResult> {
  const {
    teamId,
    userId,
    featureCode,
    cost,
    idempotencyKey,
    nowSec,
    allowPartial,
  } = params;

  // Info: (20260807 - Luphia) Fail Fast：非正整數的扣款金額直接凍結
  if (typeof cost !== "bigint" || cost <= BigInt(0)) {
    throw toApiError(API_ERRORS.TW_INVALID_SPEND_AMOUNT);
  }

  return guarded(async () => {
    const member = await teamRepo.getTeamMember(userId, teamId);
    if (!member) throw toApiError(API_ERRORS.TW_NOT_TEAM_MEMBER);

    /**
     * Info: (20260813 - Luphia) 冪等重放：拆帳後同一把鍵可能同時有額度用量與錢包分錄，
     * 因此兩邊都要看齊再回傳，不能看到其中一筆就早退——早退會讓呼叫端少算另一半的預扣，
     * 結算時把「已扣的錢包點數」當成沒扣過。
     *
     * Info: (20260814 - Luphia) 「已全額退還」不算重放，而是**重試**：
     * 前一次工作失敗、預扣已退乾淨，這次是真的要再做一次工，就該再扣一次款。
     * 但原鍵的分錄還在（退款是加寫負向分錄，不是刪除），沿用原鍵會被
     * createUsage 的 unique 衝突默默吞掉——變成不扣款卻照跑 LLM。
     * 因此改用衍生鍵 `{原鍵}#retry{n}` 記這一次，並把它回傳給呼叫端結算用。
     */
    let effectiveKey = idempotencyKey;
    let records = await readSpendRecords(effectiveKey);
    let retryRound = 0;
    while (
      records.held > BigInt(0) &&
      records.outstanding <= BigInt(0) &&
      retryRound < MAX_RETRY_ROUNDS
    ) {
      retryRound += 1;
      effectiveKey = `${idempotencyKey}#retry${retryRound}`;
      records = await readSpendRecords(effectiveKey);
    }

    if (records.held > BigInt(0)) {
      // Info: (20260814 - Luphia) 仍有未退還的扣款＝真重放：回報 replayed，由呼叫端決定要不要重跑
      return toSpendResult(
        effectiveKey,
        records.quotaHeld,
        records.walletHeld,
        true,
      );
    }

    const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
    // Info: (20260809 - Luphia) 額度為系統設定，自 DB 取得（查無設定列時 fail-safe 回預設值）
    const quota = await subscriptionPlanQuotaRepo.resolveQuota(
      resolveEffectivePlanId(subscription, nowSec),
    );
    const windowKey5h = getWindowKey5h(nowSec);
    const windowKeyWeek = getWindowKeyWeek(nowSec);
    // Info: (20260814 - Luphia) 額度逐成員計算：用量只算這個人自己的（一人一池）
    const { used5h, usedWeek } = await teamQuotaUsageRepo.sumWindowUsage(
      teamId,
      userId,
      windowKey5h,
      windowKeyWeek,
    );
    const limit5h = BigInt(quota.per5h);
    const limitWeek = BigInt(quota.perWeek);

    const quotaAvailable = resolveQuotaAvailable({
      limit5h,
      used5h,
      limitWeek,
      usedWeek,
    });
    const allocation = await teamWalletRepo.getAllocation(teamId, userId);
    const walletBalance = allocation?.balance ?? BigInt(0);

    /**
     * Info: (20260813 - Luphia) 拆帳（設計書 §5.4）：訂閱額度先用光，不足的部分扣錢包。
     * 預扣封頂到可用餘額——只要還有 1 點就放行，不再因為「預扣上界塞不進剩餘額度」
     * 而把有餘額的用戶整筆擋死。
     */
    const split = splitSpend(
      cost,
      quotaAvailable,
      walletBalance,
      // Info: (20260813 - Luphia) 逐功能的扣款順序（設計書 §5.4）：物流碳足跡優先扣分配點數
      resolveSpendPriority(featureCode),
    );

    /**
     * Info: (20260813 - Luphia) 固定價格的消費不接受封頂（allowPartial = false）：
     * 沒有結算步驟就沒有人補收差額，放行等於少收。此時與「完全無餘額」同樣回 402，
     * 前端據此提示不足並停用支付按鈕。
     */
    if (!allowPartial && split.hold < cost) {
      throw new QuotaExceededError(
        API_ERRORS.TW_QUOTA_EXCEEDED,
        buildQuotaExceededPayload({
          nowSec,
          limit5h,
          used5h,
          limitWeek,
          usedWeek,
          walletBalance,
        }),
      );
    }

    if (split.hold <= BigInt(0)) {
      // Info: (20260813 - Luphia) 訂閱額度與分配點數同時見底才是真的用盡 → 402
      throw new QuotaExceededError(
        API_ERRORS.TW_QUOTA_EXCEEDED,
        buildQuotaExceededPayload({
          nowSec,
          limit5h,
          used5h,
          limitWeek,
          usedWeek,
          walletBalance,
        }),
      );
    }

    /**
     * Info: (20260813 - Luphia) 先扣錢包、後寫額度：錢包是唯一可能「條件失敗」的一方
     * （併發下餘額被別人扣走）。把它放在第一步，最常見的失敗路徑就是「什麼都還沒動」，
     * 不需要補償。反序則每次錢包不足都得回頭沖銷已寫入的額度用量。
     */
    if (split.walletPart > BigInt(0)) {
      const consumed = await teamWalletRepo.consumeAllocation({
        teamId,
        userId,
        amount: split.walletPart,
        featureCode,
        idempotencyKey: effectiveKey,
      });
      if (consumed.outcome === WALLET_OP_OUTCOME.FROZEN) {
        throw toApiError(API_ERRORS.TW_WALLET_FROZEN);
      }
      if (
        consumed.outcome !== WALLET_OP_OUTCOME.OK &&
        consumed.outcome !== WALLET_OP_OUTCOME.DUPLICATE
      ) {
        throw new QuotaExceededError(
          API_ERRORS.TW_QUOTA_EXCEEDED,
          buildQuotaExceededPayload({
            nowSec,
            limit5h,
            used5h,
            limitWeek,
            usedWeek,
            walletBalance,
          }),
        );
      }
    }

    if (split.quotaPart > BigInt(0)) {
      try {
        await teamQuotaUsageRepo.createUsage({
          teamId,
          userId,
          featureCode,
          amount: split.quotaPart,
          windowKey5h,
          windowKeyWeek,
          idempotencyKey: effectiveKey,
        });
      } catch (error) {
        /**
         * Info: (20260813 - Luphia) 額度用量寫入失敗時沖銷剛才的錢包扣款，
         * 不留「錢扣了但沒放行」的懸帳。沖銷本身失敗只能記錄——此時原始錯誤更重要，
         * 且勾稽 Worker 會在守恆檢查時抓到這筆差異。
         */
        if (split.walletPart > BigInt(0)) {
          try {
            await teamWalletRepo.refundAllocation(effectiveKey, userId);
          } catch (compensationError) {
            console.error(
              "[spend] failed to compensate wallet after quota write error",
              compensationError,
            );
          }
        }
        throw error;
      }
    }

    return toSpendResult(effectiveKey, split.quotaPart, split.walletPart);
  });
}

/**
 * Info: (20260807 - Luphia) 失敗補償（設計書 §5.2）：依原始扣款來源反向沖銷。
 * 查無原始扣款回 refunded = false（呼叫端 Worker 據此判斷 no-op），不丟錯誤；
 * 補償本身冪等（refund: 前綴鍵），Worker 重試不會重複退款。
 *
 * Info: (20260813 - Luphia) 拆帳後兩邊都要沖銷（設計書 §5.4）：只沖一邊會留下
 * 「錢包扣了但功能失敗」的懸帳，而那一半正好是用戶花錢買來的部分。
 */
export async function refundCredits(
  params: IRefundParams,
): Promise<IRefundResult> {
  const { idempotencyKey, operatorUserId } = params;

  return guarded(async () => {
    const records = await readSpendRecords(idempotencyKey);
    if (records.held <= BigInt(0)) return { refunded: false, source: null };

    /**
     * Info: (20260814 - Luphia) 退款守恆：只退「尚未退還的部分」。
     *
     * 結算退差額（`settle:`）與失敗補償（`refund:`）是兩把不同的鍵，各自只擋自己重複。
     * 若在結算之後又走一次補償，補償若照原始預扣全額退，就會退出一筆從未扣過的額度
     * （預扣 6、實耗 4 已退 2，再退 6 → 淨額 −2）。
     */
    const quotaRefundable = records.quotaHeld - records.quotaRefunded;
    const walletRefundable = records.walletHeld - records.walletRefunded;
    if (quotaRefundable <= BigInt(0) && walletRefundable <= BigInt(0)) {
      // Info: (20260814 - Luphia) 已經退乾淨：回報 no-op，不再寫任何分錄
      return { refunded: false, source: null };
    }

    if (quotaRefundable > BigInt(0)) {
      await teamQuotaUsageRepo.createUsage({
        teamId: records.teamId as string,
        userId: records.userId as string,
        featureCode: records.featureCode as string,
        amount: -quotaRefundable,
        // Info: (20260807 - Luphia) 退款寫回「原視窗」，確保視窗 SUM 與實際用量一致
        windowKey5h: records.windowKey5h as number,
        windowKeyWeek: records.windowKeyWeek as number,
        idempotencyKey: `refund:${idempotencyKey}`,
      });
    }

    if (walletRefundable > BigInt(0)) {
      const refunded = await teamWalletRepo.refundAllocation(
        idempotencyKey,
        operatorUserId,
        walletRefundable,
      );
      if (refunded.outcome === WALLET_OP_OUTCOME.FROZEN) {
        throw toApiError(API_ERRORS.TW_WALLET_FROZEN);
      }
    }

    return {
      refunded: true,
      source: resolveSettledSource(quotaRefundable, walletRefundable),
    };
  });
}

/**
 * Info: (20260813 - Luphia) 追補差額所需的記帳上下文（設計書 §5.4）。
 * 純錢包預扣（扣款當下額度已見底）沒有額度用量列可沿用 teamId 與視窗，
 * 而追補一律記進訂閱額度，因此這些欄位只能由呼叫端注入。
 */
export interface ISettleContext {
  teamId: string;
  userId: string;
  featureCode: BillableFeatureCode;
}

export interface ISettleParams {
  idempotencyKey: string;
  actualCost: bigint;
  operatorUserId: string;
  context?: ISettleContext;
  /**
   * Info: (20260813 - Luphia) 追補差額時決定要記進哪個視窗（設計書 §5.4）。
   * 純錢包預扣（額度已見底）沒有額度用量列可沿用視窗，此時才需要它；
   * 時間一律由呼叫端注入，維持視窗數學的決定論。
   */
  nowSec?: number;
}

export interface ISettleResult {
  settled: boolean;
  source: SpendSource | null;
  held: string;
  charged: string;
  refunded: string;
  // Info: (20260813 - Luphia) 因預扣被餘額封頂而於結算階段追補的額度（設計書 §5.4）
  toppedUp: string;
}

function resolveSettledSource(
  quotaAmount: bigint,
  walletAmount: bigint,
): SpendSource {
  if (quotaAmount > BigInt(0) && walletAmount > BigInt(0)) {
    return SPEND_SOURCE.MIXED;
  }
  return walletAmount > BigInt(0)
    ? SPEND_SOURCE.TEAM_ALLOCATION
    : SPEND_SOURCE.SUBSCRIPTION_QUOTA;
}

/**
 * Info: (20260807 - Luphia) 預扣—結算（設計書 §5.3 步驟 3）：
 * 依實際用量退還「預扣 - 實耗」的差額，結算鍵 settle:{原鍵} 天然冪等。
 *
 * Info: (20260813 - Luphia) 拆帳與封頂後的兩項改變（設計書 §5.4）：
 * 1. 退差額**先退錢包**再退額度——分配點數是買來的資產，額度到期即歸零，
 *    退回額度對用戶幾乎沒有價值。
 * 2. 預扣可能被可用餘額封頂，因此 actual > held 從「估算異常」變成**預期情形**。
 *    差額一律追補到**訂閱額度**（軟限制，允許最後一筆超額，見 §5.1），
 *    絕不追扣錢包：錢包是硬限制，零容忍負餘額。追補鍵 topup:{原鍵} 天然冪等，
 *    且它同時是防濫用的關鍵——不記這筆，用戶就能靠「只剩 1 點」無限發長訊息。
 */
export async function settleSpend(
  params: ISettleParams,
): Promise<ISettleResult> {
  const { idempotencyKey, actualCost, operatorUserId, nowSec, context } =
    params;

  if (typeof actualCost !== "bigint" || actualCost <= BigInt(0)) {
    throw toApiError(API_ERRORS.TW_INVALID_SPEND_AMOUNT);
  }

  return guarded(async () => {
    const records = await readSpendRecords(idempotencyKey);
    if (records.held <= BigInt(0)) {
      return {
        settled: false,
        source: null,
        held: "0",
        charged: "0",
        refunded: "0",
        toppedUp: "0",
      };
    }

    const held = records.held;
    const source = resolveSettledSource(records.quotaHeld, records.walletHeld);

    if (actualCost > held) {
      const shortfall = actualCost - held;
      const windowKey5h = records.windowKey5h ?? getWindowKey5hOrNull(nowSec);
      const windowKeyWeek =
        records.windowKeyWeek ?? getWindowKeyWeekOrNull(nowSec);
      const teamId = records.teamId ?? context?.teamId ?? null;
      const userId = records.userId ?? context?.userId ?? null;
      const featureCode = records.featureCode ?? context?.featureCode ?? null;

      if (
        windowKey5h === null ||
        windowKeyWeek === null ||
        teamId === null ||
        userId === null ||
        featureCode === null
      ) {
        /**
         * Info: (20260813 - Luphia) 無視窗可寫（純錢包預扣且呼叫端未注入 nowSec）：
         * 不追補並記錄。金額微小，但靜默吞掉會讓帳面對不起來，必須看得見。
         */
        console.error(
          "[spend] cannot record settlement shortfall without quota context",
          { idempotencyKey, shortfall: shortfall.toString() },
        );
        return {
          settled: true,
          source,
          held: held.toString(),
          charged: held.toString(),
          refunded: "0",
          toppedUp: "0",
        };
      }

      await teamQuotaUsageRepo.createUsage({
        teamId,
        userId,
        featureCode,
        amount: shortfall,
        windowKey5h,
        windowKeyWeek,
        idempotencyKey: `topup:${idempotencyKey}`,
      });

      return {
        settled: true,
        source,
        held: held.toString(),
        charged: actualCost.toString(),
        refunded: "0",
        toppedUp: shortfall.toString(),
      };
    }

    const refund = held - actualCost;
    const { walletRefund, quotaRefund } = splitRefund(
      refund,
      records.walletHeld,
    );

    if (walletRefund > BigInt(0)) {
      const result = await teamWalletRepo.refundAllocationPartial(
        idempotencyKey,
        walletRefund,
        operatorUserId,
      );
      if (result.outcome === WALLET_OP_OUTCOME.FROZEN) {
        throw toApiError(API_ERRORS.TW_WALLET_FROZEN);
      }
    }

    if (quotaRefund > BigInt(0)) {
      await teamQuotaUsageRepo.createUsage({
        teamId: records.teamId as string,
        userId: records.userId as string,
        featureCode: records.featureCode as string,
        amount: -quotaRefund,
        windowKey5h: records.windowKey5h as number,
        windowKeyWeek: records.windowKeyWeek as number,
        idempotencyKey: `settle:${idempotencyKey}`,
      });
    }

    return {
      settled: true,
      source,
      held: held.toString(),
      charged: actualCost.toString(),
      refunded: refund.toString(),
      toppedUp: "0",
    };
  });
}

// Info: (20260813 - Luphia) nowSec 未注入時回 null（而非丟錯）：追補失敗不該讓整筆結算炸掉
function getWindowKey5hOrNull(nowSec?: number): number | null {
  return typeof nowSec === "number" ? getWindowKey5h(nowSec) : null;
}

function getWindowKeyWeekOrNull(nowSec?: number): number | null {
  return typeof nowSec === "number" ? getWindowKeyWeek(nowSec) : null;
}

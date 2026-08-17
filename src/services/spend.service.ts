import {
  BillableFeatureCode,
  type SpendSource,
  QUOTA_EXCEEDED_OPTION,
  type QuotaExceededOption,
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
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { logger } from "@/lib/utils/logger";
import {
  chargeChainCredits,
  isChainCreditSpendable,
  readChainCredits,
} from "@/lib/quota/personal_chain_credits";
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
  /**
   * Info: (20260815 - Luphia) 本次操作的金額（PR #6652 第二輪 C-5）：
   * 用來判斷「等重置會不會有幫助」。不提供時視為 0（等重置一定有幫助）。
   */
  cost?: bigint;
}): IQuotaExceededPayload {
  const { nowSec, limit5h, used5h, limitWeek, usedWeek, walletBalance } = input;
  const cost = input.cost ?? BigInt(0);
  const remaining5h = limit5h - used5h;
  const remainingWeek = limitWeek - usedWeek;
  /**
   * Info: (20260815 - Luphia) 單筆金額超過整個視窗上限時，等重置永遠不會好（第二輪 C-5）。
   *
   * 免費版每 5 小時 10 點，而一張 AI 分析報告要 50 點——這種失敗與「這段時間用太多」
   * 是兩回事，卻共用同一個 402。顯示「將於 X 重置」等於請用戶去等一件不會發生的事。
   */
  const exceedsWindowLimit =
    cost > BigInt(0) && (cost > limit5h || cost > limitWeek);
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
    exceedsWindowLimit,
    /**
     * Info: (20260815 - Luphia) 出路要與事實一致：等重置不會好的情況就不要列它，
     * 改列「升級方案」——那才是把單筆上限拉高的唯一辦法。
     *
     * Info: (20260818 - Luphia) 同一條規則也適用於個人點數（第四輪 B-1）。
     *
     * 第二層停用之後（`isChainCreditSpendable()` 回 false，因為合約沒有可由
     * 平台呼叫的 `burn(address, uint256)`），「改用個人點數」是一條**可證明
     * 不存在**的出路。同一批修改已經把 `allocationBalance` 誠實讀成 0，
     * 卻把這個選項留在 payload 裡——畫面沒壞（提示只有兩個連結），
     * 但 payload 是 API 契約的一部分，而它在說謊。
     *
     * 恢復方式：合約補上銷毀函式、`isChainCreditSpendable()` 回 true，
     * 這個選項就會自動回來，不需要改這裡。
     */
    options: buildQuotaExceededOptions(exceedsWindowLimit),
  };
}

/**
 * Info: (20260818 - Luphia) 402 的「出路」清單（第四輪 B-1）。
 * 抽成函式是為了讓「哪些出路真的存在」有單一判斷點，並且測得到。
 */
export function buildQuotaExceededOptions(
  exceedsWindowLimit: boolean,
): QuotaExceededOption[] {
  /**
   * Info: (20260818 - Luphia) 順序照原本的兩種排法，**不要統一**（第四輪自審）。
   *
   * 前端依序呈現這些出路，而兩種情境的第一順位刻意不同：
   * 單筆超過視窗上限時「等重置」不會好，最該先講的是自己的點數；
   * 一般的額度用罄則是「等一下就好」為主。抽成函式時順手把兩者統一成
   * 「個人點數優先」會靜悄悄改掉一般情境的引導順序——那不是這次要改的事。
   */
  const spendable = isChainCreditSpendable();

  if (exceedsWindowLimit) {
    return spendable
      ? [
          QUOTA_EXCEEDED_OPTION.USE_PERSONAL_WALLET,
          QUOTA_EXCEEDED_OPTION.UPGRADE_PLAN,
        ]
      : [QUOTA_EXCEEDED_OPTION.UPGRADE_PLAN];
  }

  // Info: (20260818 - Luphia) 第二層不可用時不列它：那是一顆不會有反應的按鈕
  return spendable
    ? [
        QUOTA_EXCEEDED_OPTION.WAIT_RESET,
        QUOTA_EXCEEDED_OPTION.USE_PERSONAL_WALLET,
      ]
    : [QUOTA_EXCEEDED_OPTION.WAIT_RESET];
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
    const limit5h = BigInt(quota.per5h);
    const limitWeek = BigInt(quota.perWeek);

    /**
     * Info: (20260814 - Luphia) 第二層讀**成員自己的鏈上點數**（PR #6652 第二輪 A-1）。
     *
     * 團隊分配已改為鑄到成員錢包（ADR 015 修訂），離鏈的 `TeamWalletAllocation`
     * 對新資料永遠是 0——再讀它就會出現「成員手上有 1,000 點、系統說他有 0 點」。
     *
     * 但**預扣仍只從訂閱額度扣**：鏈上餘額只參與「放不放行」的判斷，
     * 真正的扣款留到結算時一次 burn（見 settleSpend）。理由是每筆預扣—結算若都動鏈，
     * 一則訊息就要兩筆交易；改成結算時一次扣清，溢出消費最多一筆。
     *
     * 這一段刻意放在鎖**之外**：它是一次鏈上 RPC，握著鎖去等網路會把
     * 同一成員的其他請求一起拖住。
     */
    const spender = await webAuthnRepo.findUserById(userId);
    /**
     * Info: (20260818 - Luphia) 不可扣款時一律視為 0（第三輪，fail-closed）。
     *
     * 合約沒有可由平台呼叫的 `burn(address, uint256)`，因此這筆餘額**扣不動**。
     * 先前把它加進 `available` 當放行依據，而扣款必定失敗、餘額永遠不減少——
     * 一個持有 ≥1 點的成員可以無上限消費，成本全部追補到**團隊額度**上。
     *
     * 讀成 0 而不是「讀出來但不採用」：這個值同時餵給 402 的
     * `walletBalance`，而那個欄位驅動的是「可改用個人點數繼續」的提示。
     * 顯示一個用不了的餘額，等於叫使用者去按一顆不會有反應的按鈕。
     */
    const chainCredits =
      spender?.address && isChainCreditSpendable()
        ? await readChainCredits(spender.address)
        : BigInt(0);

    /**
     * Info: (20260815 - Luphia) 額度的讀與寫必須在同一把鎖內（PR #6652 第二輪 C-6）。
     *
     * 「先 SUM 再寫入」中間沒有互斥時，併發的 N 個請求會讀到同一個 used、
     * 各自判斷「還有額度」、各寫一筆——超額幅度是併發數 × 單筆，
     * 而 §5.1 容許的是「最後一筆超額」，指的是一筆。
     */
    return teamQuotaUsageRepo.withMemberQuotaLock(
      teamId,
      userId,
      async (tx) => {
        // Info: (20260814 - Luphia) 額度逐成員計算：用量只算這個人自己的（一人一池）
        const { used5h, usedWeek } =
          await teamQuotaUsageRepo.sumWindowUsageInTx(
            tx,
            teamId,
            userId,
            windowKey5h,
            windowKeyWeek,
          );

        const quotaAvailable = resolveQuotaAvailable({
          limit5h,
          used5h,
          limitWeek,
          usedWeek,
        });

        /**
         * Info: (20260813 - Luphia) 預扣封頂（設計書 §5.4）：只要還有可用量就放行，
         * 不再因為「預扣上界塞不進剩餘額度」而把有餘額的用戶整筆擋死。
         */
        const split = splitSpend(cost, quotaAvailable, BigInt(0));
        const available = quotaAvailable + chainCredits;

        /**
         * Info: (20260813 - Luphia) 固定價格的消費不接受封頂（allowPartial = false）：
         * 沒有結算步驟就沒有人補收差額，放行等於少收。此時與「完全無餘額」同樣回 402，
         * 前端據此提示不足並停用支付按鈕。
         */
        if (!allowPartial && quotaAvailable < cost) {
          throw new QuotaExceededError(
            API_ERRORS.TW_QUOTA_EXCEEDED,
            buildQuotaExceededPayload({
              nowSec,
              limit5h,
              used5h,
              limitWeek,
              usedWeek,
              walletBalance: chainCredits,
            }),
          );
        }

        if (available <= BigInt(0)) {
          // Info: (20260814 - Luphia) 訂閱額度與個人鏈上點數同時見底才是真的用盡 → 402
          throw new QuotaExceededError(
            API_ERRORS.TW_QUOTA_EXCEEDED,
            buildQuotaExceededPayload({
              nowSec,
              limit5h,
              used5h,
              limitWeek,
              usedWeek,
              walletBalance: chainCredits,
            }),
          );
        }

        /**
         * Info: (20260814 - Luphia) 預扣只寫訂閱額度。
         *
         * 改制前這裡還有一段「先扣離鏈分配點數、失敗再沖銷」的流程；分配改上鏈之後
         * 那一層不存在了（見上方說明），差額改由結算時自成員錢包一次扣清。
         * 少了跨系統的兩段式扣款，這裡也就不需要補償路徑。
         */
        /**
         * Info: (20260818 - Luphia) 放行就一定要留下用量列（第三輪 A-1(c)）。
         *
         * 重放偵測的判準是 `records.held > 0`，而 `held` 是用量列的總和。
         * 先前鏈上餘額能讓 `quotaAvailable = 0` 的請求通過，於是這一段不執行、
         * 沒有任何列 → `held = 0` → 重放偵測永遠不觸發 → 同一個 clientMessageId
         * 重送 N 次就扣 N 次，而 `faithChatSchema` 承諾的是「重送不重複扣款」。
         *
         * 改為 fail-closed 之後，能走到這裡就代表 `quotaAvailable > 0`，
         * `quotaPart` 必然為正。這道檢查把那個前提從「碰巧成立」變成「寫下來」：
         * 哪天有人再讓第二層參與放行，這裡會當場炸開，而不是安靜地失去冪等。
         */
        if (split.quotaPart <= BigInt(0)) {
          throw toApiError(API_ERRORS.TW_OPERATION_FAILED);
        }

        /**
         * Info: (20260818 - Luphia) 上面已經擋掉非正數，這裡不再重複判斷（第四輪 B-3）。
         * 原本緊接著一個 `if (split.quotaPart > 0)`，在 throw 之後恆為真——
         * 留著會讓下一個讀者以為還有第三種情形。
         */
        await teamQuotaUsageRepo.createUsageInTx(tx, {
          teamId,
          userId,
          featureCode,
          amount: split.quotaPart,
          windowKey5h,
          windowKeyWeek,
          idempotencyKey: effectiveKey,
        });

        return toSpendResult(effectiveKey, split.quotaPart, BigInt(0));
      },
    );
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
  /**
   * Info: (20260815 - Luphia) **結算當下**的時間（PR #6652 第二輪 C-7）。
   *
   * 追補必須記進「結算當下」的視窗，而不是預扣時的視窗：長時間工作
   * （匯入實測 87 秒、結構圖近 90 秒）會跨過 5 小時的視窗邊界，
   * 寫回舊視窗等於寫進一個已經過期的桶——`sumWindowUsage` 只看當前視窗，
   * 那筆超額於是完全不影響後續額度，追補的防濫用作用歸零。
   *
   * 未提供時退回 `nowSec`（行為與改動前相同）。同樣由呼叫端注入以維持決定論。
   */
  settledAtSec?: number;
}

export interface ISettleResult {
  settled: boolean;
  source: SpendSource | null;
  held: string;
  charged: string;
  refunded: string;
  // Info: (20260813 - Luphia) 因預扣被餘額封頂而於結算階段追補的額度（設計書 §5.4）
  toppedUp: string;
  /**
   * Info: (20260814 - Luphia) 結算時自成員鏈上點數收取的差額與該筆交易（設計書 §5.4.4）。
   * 與 `toppedUp` 互斥：差額要嘛由成員的點數負擔，要嘛追補到訂閱額度。
   */
  chainCharged?: string;
  chainTxHash?: string;
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
  const {
    idempotencyKey,
    actualCost,
    operatorUserId,
    nowSec,
    settledAtSec,
    context,
  } = params;

  if (typeof actualCost !== "bigint" || actualCost <= BigInt(0)) {
    throw toApiError(API_ERRORS.TW_INVALID_SPEND_AMOUNT);
  }

  return guarded(async () => {
    const records = await readSpendRecords(idempotencyKey);
    /**
     * Info: (20260814 - Luphia) 預扣為 0 也要結算（PR #6652 第二輪 A-1）：
     * 額度完全用罄時放行的依據是成員的鏈上點數，此時沒有任何額度預扣列，
     * 但用量真實發生了——早退等於免費放行。有 context 就往下走，向他的點數收費。
     */
    if (records.held <= BigInt(0) && !context) {
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
      /**
       * Info: (20260815 - Luphia) 追補記進**結算當下**的視窗（PR #6652 第二輪 C-7）。
       *
       * 原本沿用預扣那一列的視窗 key，而長時間工作會跨過 5 小時邊界——
       * 追補於是寫進一個已經過期的桶，`sumWindowUsage` 只看當前視窗，
       * 那筆超額完全不影響後續額度，「防止用戶靠只剩 1 點無限發長訊息」的作用歸零。
       *
       * 退款（`settle:`）則相反，仍寫回**原視窗**：那是把當初多扣的還回去，
       * 記在原處才能讓該視窗的 SUM 與實際用量一致。
       */
      const settlementSec = settledAtSec ?? nowSec;
      const windowKey5h =
        getWindowKey5hOrNull(settlementSec) ?? records.windowKey5h;
      const windowKeyWeek =
        getWindowKeyWeekOrNull(settlementSec) ?? records.windowKeyWeek;
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

      /**
       * Info: (20260814 - Luphia) 差額優先向**成員自己的鏈上點數**收取（PR #6652 第二輪 A-1）。
       *
       * 預扣被額度封頂時，超出的部分本來就是「團隊額度之外的用量」——那正是成員個人點數
       * 該負擔的部分（改制前由離鏈分配點數承擔，分配上鏈後由他的錢包承擔）。
       * 高頻的額度消費仍完全離鏈，只有這裡的溢出會動一次鏈。
       *
       * 扣不到（沒有位址、未設定合約、餘額不足、鏈上失敗）就退回原本的作法：
       * 追補到訂閱額度（該期額度呈現超用）。少收比服務中斷好，而追補是防濫用的關鍵——
       * 不記這筆，用戶就能靠「只剩 1 點」無限發長訊息。
       */
      /**
       * Info: (20260818 - Luphia) 目前一律扣不到（第三輪）：合約沒有可由平台呼叫的
       * `burn(address, uint256)`。連查都不查，因為放行側已經不把鏈上餘額算進 `available`
       * （見 spendCredits），這裡的溢出只會來自「額度封頂」那條路——
       * 而那條路的差額本來就該追補到訂閱額度，與條款 §3.3 一致。
       *
       * **恢復前必須先做完 A-1**：先寫 DB 分錄再 burn、成功回填 txHash、失敗寫反向分錄，
       * 並帶冪等鍵。現在這支兩者都沒有——重試會再燒一次，而且帳上完全查不到
       * （`chainCharged` / `chainTxHash` 只出現在回傳物件與 log 裡）。
       */
      const spender = isChainCreditSpendable()
        ? await webAuthnRepo.findUserById(userId)
        : null;
      const chainCharge = spender?.address
        ? await chargeChainCredits(spender.address, shortfall)
        : { charged: false, reason: "not-spendable" };

      if (chainCharge.charged) {
        logger.info("settlement shortfall charged to member credits", {
          idempotencyKey,
          userId,
          shortfall: shortfall.toString(),
          txHash: chainCharge.txHash ?? "(pending)",
        });
        return {
          settled: true,
          source: SPEND_SOURCE.MIXED,
          held: held.toString(),
          charged: actualCost.toString(),
          refunded: "0",
          toppedUp: "0",
          chainCharged: shortfall.toString(),
          chainTxHash: chainCharge.txHash,
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

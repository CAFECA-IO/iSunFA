import { ResumableJob } from "@/generated";
/**
 * Info: (20260827 - Luphia) 對外的檢視型別住在 interfaces（issue #6714）：
 * 客戶端要讀它，而從 service 匯入型別會把整個 service 模組（連著 Prisma 的
 * repository）拉進客戶端的相依圖——`import type` 在編譯後會被抹掉，
 * 但那件事只要有一個人漏寫 `type` 就會變成真的把伺服器程式打包進瀏覽器。
 */
import type { IJobView } from "@/interfaces/resumable_job";
import { isCarbonChatChannelOwnedBy } from "@/constants/carbon_chatbot";
import {
  JOB_CLAIM_INTENT,
  JOB_CLAIM_TTL_MS,
  JOB_PAUSE_REASON,
  type JobClaimIntent,
  JOB_RESUME_SCAN_BATCH,
  JOB_SPEND_MODE,
  JOB_STATUS,
  JOB_TYPE,
  type JobPauseReason,
  type JobType,
} from "@/constants/resumable_job";
import {
  canAffordSpend,
  resolveQuotaAvailable,
  usesSharedTeamQuota,
} from "@/lib/quota/spend_split";
import { getWindowKey5h, getWindowKeyWeek } from "@/lib/quota/window";
import { resolveEffectivePlanId } from "@/lib/subscription/plan_rules";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";

export type { IJobView };
import { chatroomRepo } from "@/repositories/chatroom.repo";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { estimateFaithHoldCredits } from "@/lib/faith_billing";
import { resolveBillingTeamId } from "@/services/carbon_billing.service";
import {
  JOB_CLAIM,
  ResumableJobOwnershipError,
  resumableJobRepo,
} from "@/repositories/resumable_job.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";

/**
 * Info: (20260825 - Luphia) 可中斷任務的 Service（issue #6712 / #6714）。
 *
 * 它回答兩個問題，而**只有這兩個**：
 *
 * 1. 「這個任務做到哪、還剩哪些？」——書籤的讀寫。
 * 2. 「現在的餘額夠不夠繼續？」——與扣款端同一個判準（`canAffordSpend`）。
 *
 * 執行**不在這裡**：內容留在各功能自己的儲存（碳盤查是端到端加密的 blob，
 * 伺服器沒有金鑰），因此誰持有內容、誰負責跑。這一層只負責讓
 * 「什麼時候可以繼續」有一個明確的答案。
 */

function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

function toView(job: ResumableJob): IJobView {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    resourceKey: job.resourceKey,
    pauseReason: job.pauseReason,
    totalSteps: job.totalSteps,
    completedSteps: job.completedSteps,
    failedSteps: job.failedSteps,
    remainingStepIds: Array.isArray(job.remainingStepIds)
      ? (job.remainingStepIds as string[])
      : [],
    updatedAt: Math.floor(job.updatedAt.getTime() / 1000),
  };
}

/**
 * Info: (20260825 - Luphia) 唯讀的「現在夠不夠」（issue #6714）。
 *
 * 判準與扣款端共用（`canAffordSpend`），讀取也走同一組 Repo 方法——只差在
 * 不拿鎖、不寫入。**刻意不查個人鏈上點數**：那是一次 RPC，而掃描行程一輪要看
 * 50 筆任務。少算它的方向是安全的（會少說「可以繼續」，不會多說），
 * 而使用者手上永遠有「繼續」按鈕可以自己試——那條路會走完整的扣款判斷。
 */
export async function canResumeNow(params: {
  teamId: string;
  userId: string;
  cost: bigint;
  /**
   * Info: (20260826 - Luphia) 這種任務**實際的扣點模式**（`JOB_SPEND_MODE`，
   * review #6717 二輪第 3 條）。用「足額」去判斷一個封頂放行的功能，
   * 落差不是保守而是永不觸發——實測 2MB PDF 一份估 677 點，而免費／團隊的
   * 視窗上限是 10／100，那些任務永遠等不到「可以繼續」。
   */
  allowPartial: boolean;
  nowSec: number;
}): Promise<boolean> {
  const { teamId, userId, cost, allowPartial, nowSec } = params;
  if (cost <= BigInt(0)) return false;

  const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
  const planId = resolveEffectivePlanId(subscription, nowSec);
  const quota = await subscriptionPlanQuotaRepo.resolveQuota(planId);
  const windowKey5h = getWindowKey5h(nowSec);
  const windowKeyWeek = getWindowKeyWeek(nowSec);

  /**
   * Info: (20260825 - Luphia) 免費方案的額度是全隊共用一份，付費方案一人一池
   *（與 `spendCredits` 同一個判準——聚合範圍錯了，答案就錯了）。
   */
  // Info: (20260825 - Luphia) 聚合範圍的判準與扣款端共用（review #6717 低-1）
  const { used5h, usedWeek } = usesSharedTeamQuota(planId)
    ? await teamQuotaUsageRepo.sumTeamWindowUsage(
        teamId,
        windowKey5h,
        windowKeyWeek,
      )
    : await teamQuotaUsageRepo.sumWindowUsage(
        teamId,
        userId,
        windowKey5h,
        windowKeyWeek,
      );

  const quotaAvailable = resolveQuotaAvailable({
    limit5h: BigInt(quota.per5h),
    used5h,
    limitWeek: BigInt(quota.perWeek),
    usedWeek,
  });

  /**
   * Info: (20260826 - Luphia) 判準跟著該功能的扣點模式（review #6717 二輪第 3 條）。
   *
   * 先前一律用「足額」，理由寫的是「寧可少說可以繼續」——方向對，
   * 但我沒有量過數量級：那讓免費與團隊方案**永遠**等不到翻面，
   * 整支掃描行程、`RESUMABLE` 狀態與那張表都成了裝飾品。
   *
   * 鏈上點數仍不查（一輪 50 筆 RPC 太貴）：少算它的方向依然安全，
   * 因為它只會讓答案偏向「還不夠」。
   */
  return canAffordSpend({
    quotaAvailable,
    chainCredits: BigInt(0),
    cost,
    allowPartial,
  });
}

// Info: (20260825 - Luphia) 各功能在每一批步驟結束後寫回書籤（含暫停與完成）
export async function saveJobBookmark(params: {
  userId: string;
  teamId: string | null;
  type: JobType;
  resourceKey: string;
  pauseReason: JobPauseReason | null;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  remainingStepIds: string[];
  nextStepCost: string | null;
  lastError: string | null;
  nowMs: number;
}): Promise<IJobView> {
  /**
   * Info: (20260825 - Luphia) 狀態由「有沒有暫停原因」與「還剩不剩步驟」推導，
   * 不由呼叫端傳——那會讓「PAUSED 但沒有原因」「COMPLETED 但還有剩」這種
   * 自相矛盾的組合寫得進資料庫。
   */
  const status =
    params.pauseReason !== null
      ? JOB_STATUS.PAUSED
      : params.remainingStepIds.length === 0
        ? JOB_STATUS.COMPLETED
        : JOB_STATUS.RUNNING;

  try {
    const job = await resumableJobRepo.upsert({
      ...params,
      status,
      lastError: params.lastError?.slice(0, 500) ?? null,
    });
    return toView(job);
  } catch (error) {
    /**
     * Info: (20260826 - Luphia) Repo 的第二道防線轉成 403（阻擋-1）：
     * 不讓底層錯誤細節噴到前端（CLAUDE.md §6），也不與「查不到」混用同一個碼
     * ——這裡確定那一列存在，只是不屬於呼叫者。
     */
    if (error instanceof ResumableJobOwnershipError) {
      throw toApiError(API_ERRORS.AUTH_PERMISSION_DENIED);
    }
    throw error;
  }
}

/**
 * Info: (20260825 - Luphia) 由 channel 推導付費團隊與下一步成本，然後寫書籤
 *（issue #6712）。
 *
 * 兩個值**都不收呼叫端的**：
 *
 * - `teamId` 決定這筆消費算誰的。前端說了算的話，掃描行程會拿別的團隊的額度
 *   去判斷「現在夠不夠」。推導走 `resolveBillingTeamId`——與扣款端同一支。
 * - `nextStepCost` 決定要不要把任務翻成「可以繼續」。前端算一份的話，
 *   它與扣款端的估算遲早分岔，而分岔的症狀是「說可以繼續、按下去又撞牆」。
 *   估算走 `estimateFaithHoldCredits`——同樣與扣款端同一支。
 *
 * 沒有帳本的會話（個人點數路徑）沒有付費團隊：`teamId` 為 null，
 * 掃描行程會把它算進 `unknown` 而不是猜一個。那條路的暫停原因本來就是
 * `PAYMENT_REQUIRED`，不由額度翻面。
 */
/**
 * Info: (20260826 - Luphia) 資源所有權裁決（review #6717 二輪阻擋-1）。
 *
 * 書籤的鍵是 `(resourceKey, type)`，而碳盤查的 `resourceKey` 是**可推導的**
 * 頻道：`carbon-chat-{錢包位址}-{sessionId}`，位址是鏈上公開資訊、
 * 預設 sessionId 是常數。少了這一步，任何登入者都能把別人的接續書籤
 * 覆寫掉（連 `userId` 一起改成自己）——而同一個功能的
 * `import/notice` 路由早就有這道守門，`chatroom.repo` 的註解也把它寫成前提。
 *
 * 用 `switch` 而不是 `if`：新增 `JOB_TYPE` 時 TypeScript 會要求補這一條，
 * 而下一個型別的 `resourceKey` 不一定是頻道——「這個資源屬於誰」必須
 * 每一種各自回答，不能靠一條通則。
 */
function assertResourceOwnedBy(
  type: JobType,
  resourceKey: string,
  address: string | undefined,
): void {
  switch (type) {
    case JOB_TYPE.CARBON_REPORT_IMPORT: {
      if (!address || !isCarbonChatChannelOwnedBy(resourceKey, address)) {
        throw toApiError(API_ERRORS.AUTH_PERMISSION_DENIED);
      }
      return;
    }
    default: {
      /**
       * Info: (20260826 - Luphia) 沒有明確規則就不放行：新型別必須先回答
       * 「這個資源屬於誰」，而預設值只能是拒絕。
       */
      throw toApiError(API_ERRORS.AUTH_PERMISSION_DENIED);
    }
  }
}

export async function saveJobBookmarkForChannel(params: {
  userId: string;
  // Info: (20260826 - Luphia) 所有權裁決用（阻擋-1）：頻道前綴必須是這個人的位址
  address: string | undefined;
  type: JobType;
  resourceKey: string;
  pauseReason: JobPauseReason | null;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  remainingStepIds: string[];
  nextStepInputChars?: number;
  lastError?: string | null;
  nowMs: number;
}): Promise<IJobView> {
  /**
   * Info: (20260826 - Luphia) **先裁決所有權**，再做任何查詢或寫入（阻擋-1）。
   *
   * 個人會話（未綁帳本）那條路上 `resolveBillingTeamId` 不會被呼叫，
   * 因此它原本是唯一的授權來源時等於沒有授權——而個人會話正是這個功能
   * 主要服務的對象。
   */
  assertResourceOwnedBy(params.type, params.resourceKey, params.address);

  const accountBookId = await chatroomRepo.findAccountBookIdByChannel(
    params.resourceKey,
  );
  const teamId = accountBookId
    ? await resolveBillingTeamId(accountBookId, params.userId)
    : null;

  let nextStepCost: string | null = null;
  if (teamId && params.nextStepInputChars !== undefined) {
    const billing = await faithBillingSettingRepo.resolveSetting();
    nextStepCost = String(
      estimateFaithHoldCredits(params.nextStepInputChars, true, billing),
    );
  }

  return saveJobBookmark({
    ...params,
    teamId,
    nextStepCost,
    lastError: params.lastError ?? null,
  });
}

export async function listOpenJobs(userId: string): Promise<IJobView[]> {
  const jobs = await resumableJobRepo.listOpenByUser(userId);
  return jobs.map(toView);
}

/**
 * Info: (20260825 - Luphia) 使用者按下「繼續」：把書籤翻成進行中並回傳剩餘步驟。
 *
 * **不在這裡做餘額檢查**：真正的判斷發生在執行時的扣款，而那一層才有鎖、
 * 才會真的動到錢。這裡先檢查一次的話，會出現「檢查說夠、扣款說不夠」的
 * 兩個答案——而使用者只會相信後者（他看到的是又一次失敗）。
 * 這一層只負責「使用者確實擁有這個任務，而且它確實還沒做完」。
 */
export async function startJobResume(params: {
  jobId: string;
  userId: string;
}): Promise<IJobView> {
  const job = await resumableJobRepo.findById(params.jobId);
  if (!job || job.userId !== params.userId) {
    throw toApiError(API_ERRORS.TW_JOB_NOT_FOUND);
  }
  if (job.status === JOB_STATUS.COMPLETED) {
    throw toApiError(API_ERRORS.TW_JOB_ALREADY_COMPLETED);
  }
  await resumableJobRepo.setStatus(job.id, JOB_STATUS.RUNNING, null);
  return toView({ ...job, status: JOB_STATUS.RUNNING, pauseReason: null });
}

/**
 * Info: (20260827 - Luphia) 取得執行許可（issue #6721）。
 *
 * 要防的事：同一個帳號開兩個分頁，補點數之後兩邊都跳出「可以繼續」，兩邊都
 * 按下去 → 同一批份送兩次 → **點數扣兩次**（一份 2MB 的 PDF 單次預扣估算
 * 約 677 點）。
 *
 * 為什麼許可要**按資源**而不是按任務 id：客戶端手上只有頻道（那是它自己的
 * 聊天室），任務 id 在伺服器。要它先查一次 id 再來換許可，等於在最要緊的
 * 路徑上多一個往返，而那個往返本身又是一個競態窗口。
 *
 * 兩種意圖共用同一把鎖，差別只在「找不到任務」與「已完成」算不算失敗：
 *
 * - 接續（`intent = RESUME`）：要有一個沒做完的任務才有意義。
 * - 新開（`intent = START`）：這個資源上沒有任務、或上一個已經做完，都正常
 *   ——重新匯入本來就會覆寫舊書籤。但**另一個分頁正在跑**時一樣要擋，
 *   否則兩個分頁各自從第一份開始，兩份帳都要付。
 */
export async function claimJobForChannel(params: {
  userId: string;
  address: string | undefined;
  type: JobType;
  resourceKey: string;
  intent: JobClaimIntent;
  nowMs: number;
}): Promise<IJobView | null> {
  // Info: (20260827 - Luphia) 與書籤同一道第一防線，且同樣在任何查詢之前
  assertResourceOwnedBy(params.type, params.resourceKey, params.address);

  let outcome;
  try {
    outcome = await resumableJobRepo.claimIfIdle({
      resourceKey: params.resourceKey,
      type: params.type,
      userId: params.userId,
      nowMs: params.nowMs,
      ttlMs: JOB_CLAIM_TTL_MS,
    });
  } catch (error) {
    // Info: (20260827 - Luphia) Repo 的第二道防線轉成 403（與 saveJobBookmark 一致）
    if (error instanceof ResumableJobOwnershipError) {
      throw toApiError(API_ERRORS.AUTH_PERMISSION_DENIED);
    }
    throw error;
  }

  switch (outcome.kind) {
    case JOB_CLAIM.CLAIMED:
      return toView(outcome.job);
    /**
     * Info: (20260827 - Luphia) 別人正在跑：兩種意圖都擋。這是這把鎖唯一
     * 真正在做的事，其餘分支只是把「為什麼不行」講清楚。
     */
    case JOB_CLAIM.BUSY:
      throw toApiError(API_ERRORS.TW_JOB_ALREADY_RUNNING);
    case JOB_CLAIM.COMPLETED:
      /**
       * Info: (20260827 - Luphia) 新開時「上一個已完成」不是錯——重新匯入
       * 本來就會覆寫舊書籤。回 null 表示「沒有可接續的任務，但你可以開始」。
       */
      if (params.intent === JOB_CLAIM_INTENT.START) return null;
      throw toApiError(API_ERRORS.TW_JOB_ALREADY_COMPLETED);
    /**
     * Info: (20260828 - Luphia) 使用者已經放棄這個任務（review #6726 高-1）。
     *
     * 接續要**明確報錯**，而不是安靜放行：那顆「接著匯入」可能還留在另一個
     * 早就開著的分頁上，而按下去會花掉他剛剛才說不要花的點數。錯誤碼與
     * 「已完成」分開，因為兩者的下一步不同——已完成是「沒有東西可做了」，
     * 已取消是「你自己說不做的」。
     *
     * 新開仍然放行：重新匯入本來就會覆寫舊書籤，與 `COMPLETED` 同一個處置。
     */
    case JOB_CLAIM.CANCELLED:
      if (params.intent === JOB_CLAIM_INTENT.START) return null;
      throw toApiError(API_ERRORS.TW_JOB_CANCELLED);
    case JOB_CLAIM.NO_JOB:
      // Info: (20260827 - Luphia) 新開時還沒有書籤是常態：第一次寫檢查點才會建
      if (params.intent === JOB_CLAIM_INTENT.START) return null;
      throw toApiError(API_ERRORS.TW_JOB_NOT_FOUND);
    default: {
      /**
       * Info: (20260827 - Luphia) 窮盡檢查：新增結果種類時 TypeScript 會在這裡
       * 要求處置，而預設值只能是拒絕——一把鎖的預設值不可以是放行。
       */
      const exhaustive: never = outcome;
      throw new Error(`unhandled claim outcome: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export async function cancelJob(params: {
  jobId: string;
  userId: string;
}): Promise<void> {
  const job = await resumableJobRepo.findById(params.jobId);
  if (!job || job.userId !== params.userId) {
    throw toApiError(API_ERRORS.TW_JOB_NOT_FOUND);
  }
  await resumableJobRepo.setStatus(job.id, JOB_STATUS.CANCELLED, null);
}

export interface IJobResumeScanSummary {
  scanned: number;
  // Info: (20260825 - Luphia) 翻成「可以繼續」的筆數
  released: number;
  // Info: (20260825 - Luphia) 還是不夠的筆數（下一輪再看）
  stillShort: number;
  /**
   * Info: (20260825 - Luphia) 因為缺件而無法判斷的筆數（沒有付費團隊、
   * 沒有下一步成本估計）。不靜默跳過——那些任務會永遠停在暫停中。
   */
  unknown: number;
}

/**
 * Info: (20260825 - Luphia) 掃描行程：把「暫停中且現在夠了」的任務翻成可以繼續。
 *
 * 三條出路（等重置／加購點數／升級方案）最後都收斂成同一句話——
 * **現在的餘額夠不夠做下一步**。因此不需要為三條路各寫一套偵測。
 *
 * ToDo: (20260827 - Luphia) 這支只做「翻牌」（PAUSED → RESUMABLE），真正把剩下
 * 幾份跑完的是使用者按下「接著匯入」。這條註解原本聲稱「付款完成的那一頁會直接
 * 接續」——那段程式不存在，已改正（issue #6714 續作）。
 */
export async function scanResumableJobs(
  nowMs: number,
  batchSize: number = JOB_RESUME_SCAN_BATCH,
): Promise<IJobResumeScanSummary> {
  const log = logger.child({ service: "ResumableJobScan" });
  const summary: IJobResumeScanSummary = {
    scanned: 0,
    released: 0,
    stillShort: 0,
    unknown: 0,
  };

  const jobs = await resumableJobRepo.listPausedForScan(batchSize);
  summary.scanned = jobs.length;
  const nowSec = Math.floor(nowMs / 1000);

  for (const job of jobs) {
    /**
     * Info: (20260825 - Luphia) 只處理「等點數」這種暫停。需要個人付款的那種
     *（`PAYMENT_REQUIRED`）不由額度決定：它要的是一筆簽章付款，
     * 而那件事只有使用者本人做得到——翻成「可以繼續」會是一個假承諾。
     */
    if (job.pauseReason !== JOB_PAUSE_REASON.CREDITS_EXHAUSTED) {
      summary.unknown += 1;
      continue;
    }
    const spendMode = JOB_SPEND_MODE[job.type as JobType];
    if (!job.teamId || !spendMode) {
      summary.unknown += 1;
      log.warn("paused job cannot be evaluated", {
        jobId: job.id,
        reason: !job.teamId ? "no_team" : "unknown_job_type",
      });
      continue;
    }
    /**
     * Info: (20260826 - Luphia) 封頂放行的任務**不需要**成本估算就判斷得出來
     *（只要還有一點可用量就跑得動）。先前一律要求 `nextStepCost`，
     * 而那個欄位在常態路徑上曾經是 null——兩個問題疊起來就是永遠不翻面。
     * 足額模式仍然需要它：不知道要多少就無法回答「夠不夠」。
     */
    const cost = job.nextStepCost ? BigInt(job.nextStepCost) : BigInt(1);
    if (!spendMode.allowPartial && !job.nextStepCost) {
      summary.unknown += 1;
      log.warn("paused job cannot be evaluated", {
        jobId: job.id,
        reason: "no_next_step_cost",
      });
      continue;
    }

    try {
      const affordable = await canResumeNow({
        teamId: job.teamId,
        userId: job.userId,
        cost,
        allowPartial: spendMode.allowPartial,
        nowSec,
      });
      if (!affordable) {
        summary.stillShort += 1;
        continue;
      }
      /**
       * Info: (20260825 - Luphia) 翻面用條件更新（見 Repo 的說明）：使用者可能在
       * 我們讀取之後、寫入之前按了「繼續」或取消了任務，無條件覆寫會把那個狀態蓋掉。
       */
      const released = await resumableJobRepo.markResumable(job.id);
      if (released) summary.released += 1;
      else summary.unknown += 1;
    } catch (error) {
      summary.unknown += 1;
      log.error("paused job scan failed", {
        jobId: job.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log.info("resumable job scan finished", { ...summary });
  return summary;
}

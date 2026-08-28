import { ResumableJob } from "@/generated";
import { isCarbonChatChannelOwnedBy } from "@/constants/carbon_chatbot";
import {
  JOB_PAUSE_REASON,
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
import { chatroomRepo } from "@/repositories/chatroom.repo";
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { estimateFaithHoldCredits } from "@/lib/faith_billing";
import { resolveBillingTeamId } from "@/services/carbon_billing.service";
import {
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

export interface IJobView {
  id: string;
  type: string;
  status: string;
  resourceKey: string;
  pauseReason: string | null;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  remainingStepIds: string[];
  updatedAt: number;
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
 * **現在的餘額夠不夠做下一步**。因此不需要為三條路各寫一套偵測；
 * 加購與升級的使用者甚至不必等這支迴圈：付款完成的那一頁會直接接續。
 * 這支是為了「人已經離開頁面」的情形。
 */
/**
 * Info: (20260828 - Julian) 個人付款完成後，把卡在「等付款」的任務翻成可以繼續。
 *
 * ## 為什麼不放進 `scanResumableJobs`
 *
 * 那支刻意跳過 `PAYMENT_REQUIRED`，兩層理由都仍然成立：
 *
 * 1. **判斷不出來**：個人點數在鏈上，要問就得發 RPC。掃描一輪 50 筆、每 5 分鐘
 *    一次，那是每 5 分鐘 50 次鏈上查詢。
 * 2. **就算查得出來也不該翻**：那個暫停原因不是「餘額不夠」，是「這筆錢需要你簽章」。
 *    沒付款就是不能繼續，翻成「可以繼續」是一個假承諾。
 *
 * 所以這條路是**事件驅動**：`TxTracker` 確認入帳、把訂單標成 `PAID` 的那一刻
 * 呼叫這裡。一次付款確認配一次 DB 查詢，零額外 RPC，而且比 5 分鐘輪詢更即時。
 *
 * ## 為什麼不再確認一次餘額
 *
 * 與 `POST /v1/user/job/[job_id]/resume` 一致 —— 它的檔頭寫著：先檢查一次會出現
 * 「檢查說夠、扣款說不夠」兩個答案，而使用者只會相信後者。付款確認過就翻面，
 * 夠不夠讓實際扣款說了算；還是不夠的話它會再暫停一次，那條路徑本來就在。
 *
 * ## 通知在哪裡
 *
 * 不在這裡 —— `JOB_RESUMABLE` 是**活算**的待辦（見 `TODO_NOTIFICATION_TYPES`）。
 * 翻成 `RESUMABLE` 這件事本身就是通知：小鈴鐺下一次輪詢就會從
 * `listResumableByUser` 讀到它。這裡不需要、也不該呼叫任何發射函式。
 *
 * @returns 真的翻面的筆數（給呼叫端記 log；沒有暫停任務時是 0，那是常態）
 */
export async function releasePaymentBlockedJobs(params: {
  userId: string;
}): Promise<number> {
  const log = logger.child({ service: "ResumableJobRelease" });
  const jobs = await resumableJobRepo.listPaymentBlockedByUser(params.userId);
  if (jobs.length === 0) return 0;

  let released = 0;
  for (const job of jobs) {
    /**
     * Info: (20260828 - Julian) 條件更新：使用者可能在付款與這一刻之間
     * 自己按了繼續或取消。無條件覆寫會把那個狀態蓋回「等著被繼續」。
     */
    if (await resumableJobRepo.markResumable(job.id)) released += 1;
  }

  log.info("payment-blocked jobs released", {
    userId: params.userId,
    found: jobs.length,
    released,
  });
  return released;
}

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

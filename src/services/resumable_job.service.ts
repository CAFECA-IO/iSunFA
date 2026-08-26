import { ResumableJob } from "@/generated";
import {
  JOB_PAUSE_REASON,
  JOB_RESUME_SCAN_BATCH,
  JOB_STATUS,
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
import { resumableJobRepo } from "@/repositories/resumable_job.repo";
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
  nowSec: number;
}): Promise<boolean> {
  const { teamId, userId, cost, nowSec } = params;
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
   * Info: (20260825 - Luphia) 以「固定價格」的嚴格判準試算（`allowPartial: false`）：
   * 額度必須足額。寧可少說「可以繼續」——多說一次的代價是使用者按下去又撞牆，
   * 而那正是這整套機制要消滅的體驗。
   */
  return canAffordSpend({
    quotaAvailable,
    chainCredits: BigInt(0),
    cost,
    allowPartial: false,
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

  const job = await resumableJobRepo.upsert({
    ...params,
    status,
    lastError: params.lastError?.slice(0, 500) ?? null,
  });
  return toView(job);
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
export async function saveJobBookmarkForChannel(params: {
  userId: string;
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
    if (!job.teamId || !job.nextStepCost) {
      summary.unknown += 1;
      log.warn("paused job cannot be evaluated", {
        jobId: job.id,
        reason: !job.teamId ? "no_team" : "no_next_step_cost",
      });
      continue;
    }

    try {
      const affordable = await canResumeNow({
        teamId: job.teamId,
        userId: job.userId,
        cost: BigInt(job.nextStepCost),
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

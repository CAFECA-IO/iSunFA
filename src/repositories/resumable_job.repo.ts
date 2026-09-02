import { prisma } from "@/lib/prisma";
import { ResumableJob } from "@/generated";
import {
  JOB_OPEN_STATUSES,
  JOB_PAUSE_REASON,
  JOB_RESUMABLE_NOTICE_LIMIT,
  JOB_STATUS,
  type JobPauseReason,
  type JobStatus,
  type JobType,
} from "@/constants/resumable_job";

/**
 * Info: (20260825 - Luphia) 可中斷任務書籤的 Repository（issue #6712）。
 *
 * 只做資料存取。「什麼算暫停」「現在夠不夠繼續」都是業務判斷，在 Service 層。
 */

export interface IUpsertJobInput {
  userId: string;
  teamId: string | null;
  type: JobType;
  resourceKey: string;
  status: JobStatus;
  pauseReason: JobPauseReason | null;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  remainingStepIds: string[];
  nextStepCost: string | null;
  lastError: string | null;
  nowMs: number;
}

/**
 * Info: (20260826 - Luphia) 書籤已存在且屬於別人。
 *
 * 不是 Prisma 的原始錯誤也不是通用錯誤：呼叫端要能把它轉成 403，
 * 而 Service 的錯誤邊界規則是「不讓底層錯誤細節噴到前端」（CLAUDE.md §6）。
 */
export class ResumableJobOwnershipError extends Error {
  constructor(resourceKey: string, type: string) {
    super(`resumable job ${type}@${resourceKey} belongs to another user`);
    this.name = "ResumableJobOwnershipError";
  }
}

export class ResumableJobRepository {
  /**
   * Info: (20260825 - Luphia) 同一個資源的同一種任務只有一筆書籤（`@@unique`）。
   *
   * 重新匯入時覆寫它而不是新增：留著舊的會讓畫面同時顯示兩個「未完成的匯入」，
   * 而使用者只認得最新那一次。
   *
   * `pausedAt` 只在**進入**暫停時寫：每次更新都覆寫它的話，
   * 「停了多久」就永遠是 0——而掃描行程與客服都要用那個時間差。
   */
  async upsert(input: IUpsertJobInput): Promise<ResumableJob> {
    const isPaused = input.status === JOB_STATUS.PAUSED;
    const existing = await prisma.resumableJob.findUnique({
      where: {
        resourceKey_type: {
          resourceKey: input.resourceKey,
          type: input.type,
        },
      },
      select: { status: true, pausedAt: true, userId: true },
    });

    /**
     * Info: (20260826 - Luphia) **第二道防線**：既有列不屬於這個人就不動它
     *（review #6717 二輪阻擋-1）。
     *
     * 第一道在 Service（資源所有權裁決）。這裡再擋一次，因為那兩件事不同：
     * 「這個頻道是不是你的」與「這一列任務是不是你的」——`@@unique` 的鍵是
     * `(resourceKey, type)`，不含 `userId`，而 `update` 會改寫 `userId`。
     * 也就是說少了這一道，任何能通過第一道的路徑都能把既有列認領走，
     * 而下一個 `JOB_TYPE` 的 `resourceKey` 不一定是頻道——第一道的規則
     * 到那時可能就不適用了。
     */
    if (existing && existing.userId !== input.userId) {
      throw new ResumableJobOwnershipError(input.resourceKey, input.type);
    }
    const enteringPause = isPaused && existing?.status !== JOB_STATUS.PAUSED;
    const pausedAt = isPaused
      ? enteringPause
        ? new Date(input.nowMs)
        : (existing?.pausedAt ?? null)
      : null;

    const data = {
      userId: input.userId,
      teamId: input.teamId,
      status: input.status,
      pauseReason: input.pauseReason,
      pausedAt,
      totalSteps: input.totalSteps,
      completedSteps: input.completedSteps,
      failedSteps: input.failedSteps,
      remainingStepIds: input.remainingStepIds,
      nextStepCost: input.nextStepCost,
      lastError: input.lastError,
    };

    return prisma.resumableJob.upsert({
      where: {
        resourceKey_type: {
          resourceKey: input.resourceKey,
          type: input.type,
        },
      },
      update: data,
      create: {
        ...data,
        type: input.type,
        resourceKey: input.resourceKey,
      },
    });
  }

  async findById(id: string): Promise<ResumableJob | null> {
    return prisma.resumableJob.findUnique({ where: { id } });
  }

  async findByResource(
    resourceKey: string,
    type: JobType,
  ): Promise<ResumableJob | null> {
    return prisma.resumableJob.findUnique({
      where: { resourceKey_type: { resourceKey, type } },
    });
  }

  // Info: (20260825 - Luphia) 使用者自己的未完成任務（畫面的橫幅用）
  async listOpenByUser(userId: string): Promise<ResumableJob[]> {
    return prisma.resumableJob.findMany({
      where: { userId, status: { in: [...JOB_OPEN_STATUSES] } },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * Info: (20260828 - Julian) 小鈴鐺的活算來源：這位使用者「可以繼續」的任務。
   *
   * 只撈 `RESUMABLE`，不撈 `PAUSED` —— 後者是「還不能繼續」，推一則待辦給他
   * 只會是一個他做不到的要求。也不撈 `RUNNING`：那是他已經按下去了。
   *
   * 活算而不入庫的理由見 `TODO_NOTIFICATION_TYPES`：狀態一離開 `RESUMABLE`
   *（按繼續轉 RUNNING、取消轉 CANCELLED），那則通知就該自然消失。
   *
   * 這支會被每 60 秒的摘要輪詢打到，所以只選畫面用得到的欄位，
   * 並且靠 `@@index([userId, status])`。
   */
  async listResumableByUser(
    userId: string,
  ): Promise<{ items: ResumableJob[]; hasMore: boolean }> {
    /**
     * Info: (20260901 - Julian) 多取一則來判斷 hasMore（review：D4）。
     *
     * 與 `notificationRepo.listRecentExcludingTypes` 同一個慣用法。靜默截斷
     * 會被讀成「這就是全部」，而使用者沒有任何方式發現少了幾份可以繼續的匯入。
     */
    const rows = await prisma.resumableJob.findMany({
      where: { userId, status: JOB_STATUS.RESUMABLE },
      orderBy: { updatedAt: "desc" },
      take: JOB_RESUMABLE_NOTICE_LIMIT + 1,
    });
    return {
      items: rows.slice(0, JOB_RESUMABLE_NOTICE_LIMIT),
      hasMore: rows.length > JOB_RESUMABLE_NOTICE_LIMIT,
    };
  }

  /**
   * Info: (20260901 - Julian) 摘要用的計數與最新翻面時間（review：D4）。
   *
   * ## 為什麼摘要不能用 `listResumableByUser`
   *
   * 那一支帶 `take`，而摘要的 `todoCount` 是**徽章上的數字**。先前直接拿
   * 它的 `length` 當計數，於是第 6 份可以繼續的匯入起，徽章與清單一起
   * 停在 5 —— 而同一行的另外兩個加數都沒有截斷（邀請的查詢沒有 `take`、
   * 入庫待辦走 `groupBy` 計數）。三個加數裡混一個截斷值，症狀是徽章
   * 少算而且沒有任何提示，正是 `notification.repo.ts` 記過的 D4
   *（「把 37 個完成通知顯示成 20」）換一個來源重演。
   *
   * ## 為什麼是 `aggregate` 而不是 `count` 加一支查詢
   *
   * 摘要同時要「幾筆」與「最新一次翻面是什麼時候」（後者是提示音的抵達鍵，
   * 見 `arrivalKeyOf`）。兩件事來自同一批列，分兩次查不只多一趟往返，
   * 還可能看到不一致的快照 —— 與 `summarizeUnread` 把 `_count` 與 `_max`
   * 併進同一個 `groupBy` 是同一條理由。
   *
   * 走 `@@index([userId, status])`，不撈任何欄位。
   */
  async summarizeResumable(userId: string): Promise<{
    count: number;
    latestUpdatedAt: Date | null;
  }> {
    const result = await prisma.resumableJob.aggregate({
      where: { userId, status: JOB_STATUS.RESUMABLE },
      _count: { _all: true },
      _max: { updatedAt: true },
    });
    return {
      count: result._count._all,
      latestUpdatedAt: result._max.updatedAt,
    };
  }

  /**
   * Info: (20260828 - Julian) 個人付款那條路要翻的：這位使用者卡在**等付款**的任務。
   *
   * 與 `listPausedForScan` 分開的理由是兩者的觸發完全不同：那支是 5 分鐘輪詢、
   * 跨使用者、看團隊額度；這支是**付款確認後**針對單一使用者查一次。
   * 合成一支會讓「掃描要不要處理 PAYMENT_REQUIRED」這個已經回答過的問題重新打開
   *（答案是不要 —— 見 `resumable_job.service.ts` 的 `scanResumableJobs`）。
   *
   * Info: (20260831 - Julian) 條件加上 `resourceKey`（review #6732 的 1-A）。
   *
   * 原本只以 `userId` 為條件，於是「使用者付了一筆款」被當成
   * 「他所有等付款的任務都付過了」。一位使用者身上 N 筆等付款的任務，
   * 會在他**任何一次** ICP 訂單轉 `PAID` 時全部翻面、各發一則
   * 「可以繼續了」—— 其中只有一筆是真的付過的，其餘按下去會再撞一次 402，
   * 而下一筆付款又會把它們全部翻一次（`markResumable` 刷新 `updatedAt`
   * 就會產生新的抵達鍵），形成沒有上限的通知噪音。
   *
   * `userId` 仍然留著：`resourceKey` 是可推導的字串（見
   * `buildCarbonChatChannel`），單靠它等於讓查詢跨租戶。兩個條件都要。
   */
  async listPaymentBlockedByResource(
    userId: string,
    resourceKey: string,
  ): Promise<ResumableJob[]> {
    return prisma.resumableJob.findMany({
      where: {
        userId,
        resourceKey,
        status: JOB_STATUS.PAUSED,
        pauseReason: JOB_PAUSE_REASON.PAYMENT_REQUIRED,
      },
      orderBy: { updatedAt: "asc" },
    });
  }

  /**
   * Info: (20260825 - Luphia) 掃描行程要處理的：**暫停中**的任務，最久沒動的先看。
   *
   * 只撈 PAUSED，不撈 RESUMABLE——後者已經翻過面了，再翻一次沒有意義，
   * 而且每一筆都要讀一次額度（含一次鏈上餘額查詢）。
   */
  async listPausedForScan(limit: number): Promise<ResumableJob[]> {
    return prisma.resumableJob.findMany({
      where: { status: JOB_STATUS.PAUSED },
      orderBy: { updatedAt: "asc" },
      take: limit,
    });
  }

  /**
   * Info: (20260825 - Luphia) 翻成「可以繼續」——**只有仍在暫停中的列翻得動**。
   *
   * `updateMany` 帶 `status: PAUSED` 的條件是刻意的：使用者可能在掃描行程讀取
   * 之後、寫入之前按了「繼續」（那時列已是 RUNNING），或是取消了任務。
   * 無條件覆寫會把那些狀態蓋回去——把一個正在跑的任務標成「等著被繼續」。
   *
   * Info: (20260828 - Julian) 一併清掉 `pauseReason` 與 `pausedAt`。
   *
   * schema 給 `pauseReason` 的定義是「**null＝不是暫停狀態**」，而 `RESUMABLE`
   * 不是暫停狀態。先前這裡只改 `status`，於是翻面後的列同時是
   * 「可以繼續」又「因為額度用盡而暫停」—— 正是 `saveJobBookmark` 的註解
   * 說要避免的那種自相矛盾的組合，只是從另一個寫入路徑漏進來。
   *
   * 另外兩支寫入的 `pausedAt` 都已經維持這個不變式（`upsert` 的
   * `isPaused ? … : null`、`setStatus` 的三元），這裡是唯一的例外；
   * 而它們的 `pauseReason` 是原封不動收呼叫端的——保證在上一層
   *（`saveJobBookmark` 由原因推導狀態、`setStatus` 的兩個呼叫端都明寫 null）。
   *
   * 三支各寫一次、其中兩支的保證還在別層的東西，漏掉一格不會有任何人發現
   * —— 所以 `resumable_job_write_invariants.test.ts` 把三支連同那兩層
   * 一起釘住。
   *
   * 今天沒有人讀 `RESUMABLE` 狀態下的 `pauseReason`（前端 `import_preview.tsx`
   * 宣告了那個 prop 但沒有用它），所以這是預防性的修正而不是修 bug。
   * 但它會擋掉一種具體的未來錯誤：有人想用 `pauseReason` 決定文案
   *（「額度已重置」vs「款項已到帳」）時，讀到的會是一個過期的值。
   */
  async markResumable(id: string): Promise<boolean> {
    const result = await prisma.resumableJob.updateMany({
      where: { id, status: JOB_STATUS.PAUSED },
      data: {
        status: JOB_STATUS.RESUMABLE,
        pauseReason: null,
        pausedAt: null,
      },
    });
    return result.count === 1;
  }

  // Info: (20260825 - Luphia) 接續／取消：狀態與暫停原因一起換，不留下孤立的原因
  async setStatus(
    id: string,
    status: JobStatus,
    pauseReason: JobPauseReason | null = null,
  ): Promise<void> {
    await prisma.resumableJob.update({
      where: { id },
      data: {
        status,
        pauseReason,
        pausedAt: status === JOB_STATUS.PAUSED ? new Date() : null,
      },
    });
  }
}

export const resumableJobRepo = new ResumableJobRepository();

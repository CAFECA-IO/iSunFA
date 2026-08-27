import { prisma } from "@/lib/prisma";
import { ResumableJob } from "@/generated";
import {
  JOB_OPEN_STATUSES,
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

/**
 * Info: (20260827 - Luphia) 取得執行許可的四種結果（issue #6721）。
 *
 * 不用布林：呼叫端對四種情況的處置全都不同（沒有任務→404、別人正在跑→
 * 留著按鈕請他等、已完成→收起按鈕、拿到→開跑），而布林會把它們壓成一句
 * 「失敗」，於是畫面只能說一句放之四海的錯誤訊息。
 */
export const JOB_CLAIM = {
  CLAIMED: "CLAIMED",
  BUSY: "BUSY",
  COMPLETED: "COMPLETED",
  NO_JOB: "NO_JOB",
} as const;

export type JobClaimKind = (typeof JOB_CLAIM)[keyof typeof JOB_CLAIM];

export type JobClaimOutcome =
  | { kind: typeof JOB_CLAIM.CLAIMED; job: ResumableJob }
  | { kind: typeof JOB_CLAIM.BUSY; job: ResumableJob; heldUntil: Date }
  | { kind: typeof JOB_CLAIM.COMPLETED; job: ResumableJob }
  | { kind: typeof JOB_CLAIM.NO_JOB };

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
   */
  async markResumable(id: string): Promise<boolean> {
    const result = await prisma.resumableJob.updateMany({
      where: { id, status: JOB_STATUS.PAUSED },
      data: { status: JOB_STATUS.RESUMABLE },
    });
    return result.count === 1;
  }

  /**
   * Info: (20260827 - Luphia) 取得執行許可（issue #6721）。
   *
   * 要防的事很具體：同一個帳號開兩個分頁（很常見——第一個看起來卡住了才開
   * 第二個），補點數之後兩邊都跳出「可以繼續」，兩邊都按下去，於是同一批份
   * 送兩次、**點數扣兩次**。一份 2MB 的 PDF 單次預扣估算約 677 點。
   *
   * 租約而不是旗標：`status === RUNNING` 且 `updatedAt` 還新鮮＝有人正在跑。
   * 過期就可以搶——分頁被強制關掉時沒有任何人會來釋放旗標，而永久鎖住的
   * 症狀是「按了沒反應」。
   *
   * 條件寫在 `updateMany` 的 `where` 裡而不是先讀再判斷：先讀後寫之間有窗口，
   * 而這把鎖的全部意義就是關掉那個窗口。前面那次 `findUnique` 只用來
   * **區分失敗的原因**（沒有任務／別人的／已完成），不參與裁決。
   */
  async claimIfIdle(params: {
    resourceKey: string;
    type: JobType;
    userId: string;
    nowMs: number;
    ttlMs: number;
  }): Promise<JobClaimOutcome> {
    const existing = await prisma.resumableJob.findUnique({
      where: {
        resourceKey_type: {
          resourceKey: params.resourceKey,
          type: params.type,
        },
      },
    });
    if (!existing) return { kind: JOB_CLAIM.NO_JOB };
    // Info: (20260827 - Luphia) 與 `upsert` 同一道第二防線：別人的列不動它
    if (existing.userId !== params.userId) {
      throw new ResumableJobOwnershipError(params.resourceKey, params.type);
    }
    if (existing.status === JOB_STATUS.COMPLETED) {
      return { kind: JOB_CLAIM.COMPLETED, job: existing };
    }

    const staleBefore = new Date(params.nowMs - params.ttlMs);
    const claimed = await prisma.resumableJob.updateMany({
      where: {
        id: existing.id,
        userId: params.userId,
        status: { not: JOB_STATUS.COMPLETED },
        /**
         * Info: (20260827 - Luphia) 可以搶的兩種情況：沒有人在跑（狀態不是
         * RUNNING），或上一個持有者的租約過期了。`updatedAt` 是 `@updatedAt`，
         * 這次寫入本身就會續租。
         */
        OR: [
          { status: { not: JOB_STATUS.RUNNING } },
          { updatedAt: { lt: staleBefore } },
        ],
      },
      data: {
        status: JOB_STATUS.RUNNING,
        pauseReason: null,
        pausedAt: null,
      },
    });
    if (claimed.count === 0) {
      return {
        kind: JOB_CLAIM.BUSY,
        job: existing,
        heldUntil: new Date(existing.updatedAt.getTime() + params.ttlMs),
      };
    }
    const fresh = await prisma.resumableJob.findUnique({
      where: { id: existing.id },
    });
    /**
     * Info: (20260827 - Luphia) 剛剛才成功更新過，讀不回來只可能是同時被刪除。
     * 回 NO_JOB 而不是硬給一個 job：呼叫端對 NO_JOB 有明確的處置。
     */
    if (!fresh) return { kind: JOB_CLAIM.NO_JOB };
    return { kind: JOB_CLAIM.CLAIMED, job: fresh };
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

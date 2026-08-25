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
      select: { status: true, pausedAt: true },
    });
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

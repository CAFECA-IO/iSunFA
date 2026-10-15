import { prisma } from "@/lib/prisma";
import { MissionSubmission, MissionTask } from "@/generated";
import { MISSION_TASK_STATUS } from "@/constants/mission_board";

// Info: (20261015 - Luphia) listTasks 會一併帶出提交紀錄，型別要讓呼叫端看得到
export type MissionTaskWithSubmissions = MissionTask & {
  submissions: MissionSubmission[];
};

/**
 * Info: (20261015 - Luphia) 任務看板 Repository（取代鏈上 MissionBoard 合約）。
 *
 * 每個方法對應合約的一個函式，前置條件也照搬合約的 `require`，
 * 違反時直接 throw（與合約 revert 同樣的失敗方向），讓呼叫端既有的錯誤處理照常運作。
 */
export class MissionBoardRepository {
  async createTask(params: {
    creator: string;
    contentCid: string;
    reward: bigint;
  }): Promise<MissionTask> {
    return prisma.missionTask.create({
      data: {
        creator: params.creator,
        contentCid: params.contentCid,
        reward: params.reward,
        status: MISSION_TASK_STATUS.OPEN,
      },
    });
  }

  async getTask(taskId: number): Promise<MissionTask | null> {
    return prisma.missionTask.findUnique({ where: { id: taskId } });
  }

  async getSubmission(
    taskId: number,
    subIndex: number,
  ): Promise<MissionSubmission | null> {
    return prisma.missionSubmission.findUnique({
      where: { taskId_subIndex: { taskId, subIndex } },
    });
  }

  async listTasksByStatus(statuses: number[]): Promise<MissionTask[]> {
    return prisma.missionTask.findMany({
      where: { status: { in: statuses } },
      orderBy: { id: "asc" },
    });
  }

  // Info: (20261015 - Luphia) 以內容識別碼找任務（amortization worker 用雜湊當 contentCid 做冪等）
  async findTaskByContentCid(contentCid: string): Promise<MissionTask | null> {
    return prisma.missionTask.findFirst({
      where: { contentCid },
      orderBy: { id: "asc" },
    });
  }

  // Info: (20261015 - Luphia) 只取 id，給資料夾 GC 判斷「這個任務還在不在」
  async listTaskIds(): Promise<number[]> {
    const rows = await prisma.missionTask.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    return rows.map((row) => row.id);
  }

  async listTasks(params: {
    skip?: number;
    take?: number;
  }): Promise<{ tasks: MissionTaskWithSubmissions[]; total: number }> {
    const [tasks, total] = await Promise.all([
      prisma.missionTask.findMany({
        orderBy: { id: "desc" },
        skip: params.skip,
        take: params.take,
        include: { submissions: { orderBy: { subIndex: "asc" } } },
      }),
      prisma.missionTask.count(),
    ]);
    return { tasks, total };
  }

  // Info: (20261015 - Luphia) 對應合約 submitResult：Open / PendingReview 才可提交
  async submitResult(params: {
    taskId: number;
    submitter: string;
    resultCid: string;
    consumedTokens: bigint;
  }): Promise<MissionSubmission> {
    return prisma.$transaction(async (tx) => {
      const task = await tx.missionTask.findUnique({
        where: { id: params.taskId },
      });
      if (!task)
        throw new Error(`MissionBoard: task ${params.taskId} not found`);
      if (
        task.status !== MISSION_TASK_STATUS.OPEN &&
        task.status !== MISSION_TASK_STATUS.PENDING_REVIEW
      ) {
        throw new Error("MissionBoard: Task not accepting submissions");
      }
      const subIndex = task.submissionCount;
      const submission = await tx.missionSubmission.create({
        data: {
          taskId: params.taskId,
          subIndex,
          submitter: params.submitter,
          resultCid: params.resultCid,
          consumedTokens: params.consumedTokens,
        },
      });
      await tx.missionTask.update({
        where: { id: params.taskId },
        data: {
          submissionCount: subIndex + 1,
          status: MISSION_TASK_STATUS.PENDING_REVIEW,
        },
      });
      return submission;
    });
  }

  // Info: (20261015 - Luphia) 對應合約 rejectSubmission：只標記該次提交，任務留在 PendingReview
  async rejectSubmission(taskId: number, subIndex: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const task = await tx.missionTask.findUnique({ where: { id: taskId } });
      if (!task || task.status !== MISSION_TASK_STATUS.PENDING_REVIEW) {
        throw new Error("MissionBoard: Invalid task status");
      }
      const sub = await tx.missionSubmission.findUnique({
        where: { taskId_subIndex: { taskId, subIndex } },
      });
      if (!sub) throw new Error("MissionBoard: Submission not found");
      if (sub.isRejected) throw new Error("MissionBoard: Already rejected");
      await tx.missionSubmission.update({
        where: { id: sub.id },
        data: { isRejected: true },
      });
    });
  }

  // Info: (20261015 - Luphia) 對應合約 approveSubmission：PendingReview / Disputed → Closed
  async approveSubmission(taskId: number, subIndex: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const task = await tx.missionTask.findUnique({ where: { id: taskId } });
      if (
        !task ||
        (task.status !== MISSION_TASK_STATUS.PENDING_REVIEW &&
          task.status !== MISSION_TASK_STATUS.DISPUTED)
      ) {
        throw new Error("MissionBoard: Invalid status");
      }
      const sub = await tx.missionSubmission.findUnique({
        where: { taskId_subIndex: { taskId, subIndex } },
      });
      if (!sub) throw new Error("MissionBoard: Submission not found");
      if (sub.isRejected) {
        throw new Error("MissionBoard: Submission was rejected");
      }
      await tx.missionTask.update({
        where: { id: taskId },
        data: { status: MISSION_TASK_STATUS.CLOSED },
      });
    });
  }

  /**
   * Info: (20261015 - Luphia) 對應合約 cancelTask：只有 Open 且沒有任何提交的任務可取消。
   *
   * 合約另有 `submissionCount == 0` 的 require，這裡照搬。目前的狀態機裡
   * 交件後任務必定離開 Open，所以這條是防線而不是常態分支；
   * 兩個條件放在同一個 `updateMany` 的 where 裡，檢查與寫入不會被其他請求插隊。
   */
  async cancelTask(taskId: number): Promise<void> {
    const updated = await prisma.missionTask.updateMany({
      where: {
        id: taskId,
        status: MISSION_TASK_STATUS.OPEN,
        submissionCount: 0,
      },
      data: { status: MISSION_TASK_STATUS.CLOSED },
    });
    if (updated.count === 0) {
      throw new Error("MissionBoard: Not Open or has submissions");
    }
  }

  /**
   * Info: (20261015 - Luphia) 對應合約 bumpTask：Open 任務的懸賞加一成。
   *
   * 合約要求加碼量 > 0（懸賞太小時整數除法得 0）；照搬，避免出現「按了加碼卻沒變」。
   */
  async bumpTask(taskId: number): Promise<MissionTask> {
    return prisma.$transaction(async (tx) => {
      const task = await tx.missionTask.findUnique({ where: { id: taskId } });
      if (!task || task.status !== MISSION_TASK_STATUS.OPEN) {
        throw new Error("MissionBoard: Task is not open");
      }
      const bumpAmount = task.reward / 10n;
      if (bumpAmount <= 0n) {
        throw new Error("MissionBoard: Bump amount too small");
      }
      return tx.missionTask.update({
        where: { id: taskId },
        data: { reward: task.reward + bumpAmount },
      });
    });
  }

  // Info: (20261015 - Luphia) 對應合約 resolveDispute：Disputed → Closed
  async closeTask(taskId: number): Promise<void> {
    await prisma.missionTask.update({
      where: { id: taskId },
      data: { status: MISSION_TASK_STATUS.CLOSED },
    });
  }
}

export const missionBoardRepo = new MissionBoardRepository();

import fs from "fs/promises";
import path from "path";
import { Prisma } from "@/generated";
import type { MissionSubmission, MissionTask } from "@/generated";
import { missionBoardRepo } from "@/repositories/mission_board.repo";
import type { MissionTaskWithSubmissions } from "@/repositories/mission_board.repo";
import {
  MISSION_PLATFORM_ACTOR,
  MISSION_REWARD_DECIMALS,
  MISSION_TASK_STATUS,
  missionFolderName,
} from "@/constants/mission_board";
import { ITask, TaskStatus } from "@/interfaces/mission_board";

/**
 * Info: (20261015 - Luphia) 任務看板 Service（取代鏈上 MissionBoard 合約的呼叫端）。
 *
 * worker 管線（issue → planner → executor → commitor → validator → closer → recorder）
 * 與管理後台都經過這裡碰 `missionBoardRepo`，讓 API / worker 不必知道資料存在哪裡。
 * 狀態轉移的前置條件在 repo（照搬合約的 require）；這一層負責
 * 「平台以誰的身分做事」、懸賞的換算，以及把 DB 列轉成畫面要的形狀。
 */

const REWARD_SCALE = new Prisma.Decimal(10).pow(MISSION_REWARD_DECIMALS);

/**
 * Info: (20261015 - Luphia) 每筆任務的懸賞（wei 刻度）。
 *
 * 原本是 `parseEther(cost / 2 / n)`，再被合約的 minReward 墊高。懸賞現在不轉任何代幣，
 * minReward 一併拿掉；換算改用 Decimal，避免原生浮點把金額算歪。
 * 非有限值或負值一律視為 0，不讓髒資料進 DB。
 */
export function computeTaskReward(
  totalCost: number,
  taskCount: number,
): bigint {
  if (!Number.isFinite(totalCost) || totalCost <= 0 || taskCount <= 0) {
    return 0n;
  }
  const perTask = new Prisma.Decimal(totalCost)
    .div(2)
    .div(taskCount)
    .mul(REWARD_SCALE)
    .floor();
  return BigInt(perTask.toFixed(0));
}

// Info: (20261015 - Luphia) wei 刻度 → 顯示用的十進位字串（取代 viem 的 formatEther）
export function formatTaskReward(reward: bigint): string {
  return new Prisma.Decimal(reward.toString()).div(REWARD_SCALE).toString();
}

export async function issueTask(params: {
  contentCid: string;
  reward: bigint;
  creator?: string;
}): Promise<MissionTask> {
  return missionBoardRepo.createTask({
    creator: params.creator ?? MISSION_PLATFORM_ACTOR,
    contentCid: params.contentCid,
    reward: params.reward,
  });
}

export async function getTask(taskId: number): Promise<MissionTask | null> {
  return missionBoardRepo.getTask(taskId);
}

export async function findTaskByContentCid(
  contentCid: string,
): Promise<MissionTask | null> {
  return missionBoardRepo.findTaskByContentCid(contentCid);
}

export async function getLatestSubmission(
  task: MissionTask,
): Promise<MissionSubmission | null> {
  if (task.submissionCount <= 0) return null;
  return missionBoardRepo.getSubmission(task.id, task.submissionCount - 1);
}

/**
 * Info: (20261015 - Luphia) planner 要規劃的任務：平台自己發的 Open 任務。
 *
 * 由其他系統 worker（例如攤銷）發的任務自己會備妥 MISSION_DIR，
 * 它們的 contentCid 也不是 Laria 的 CID；交給 planner 只會下載失敗、
 * 刪掉別人剛寫好的資料夾，並讓 planner 卡在那一筆。
 */
export async function listTasksToPlan(): Promise<MissionTask[]> {
  const tasks = await missionBoardRepo.listTasksByStatus([
    MISSION_TASK_STATUS.OPEN,
  ]);
  return tasks.filter((task) => task.creator === MISSION_PLATFORM_ACTOR);
}

// Info: (20261015 - Luphia) validator 要看的任務：等待審核，或已關閉（本地紀錄可能缺漏，要補）
export async function listTasksToValidate(): Promise<MissionTask[]> {
  const tasks = await missionBoardRepo.listTasksByStatus([
    MISSION_TASK_STATUS.PENDING_REVIEW,
    MISSION_TASK_STATUS.CLOSED,
  ]);
  return tasks.filter((task) => task.submissionCount > 0);
}

export async function submitResult(params: {
  taskId: number;
  resultCid: string;
  consumedTokens: bigint;
}): Promise<MissionSubmission> {
  return missionBoardRepo.submitResult({
    taskId: params.taskId,
    submitter: MISSION_PLATFORM_ACTOR,
    resultCid: params.resultCid,
    consumedTokens: params.consumedTokens,
  });
}

export async function approveSubmission(
  taskId: number,
  subIndex: number,
): Promise<void> {
  await missionBoardRepo.approveSubmission(taskId, subIndex);
}

export async function rejectSubmission(
  taskId: number,
  subIndex: number,
): Promise<void> {
  await missionBoardRepo.rejectSubmission(taskId, subIndex);
}

export async function cancelTask(taskId: number): Promise<void> {
  await missionBoardRepo.cancelTask(taskId);
}

export async function bumpTask(taskId: number): Promise<MissionTask> {
  return missionBoardRepo.bumpTask(taskId);
}

function toEpochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function toAdminTask(task: MissionTaskWithSubmissions): ITask {
  return {
    taskId: task.id,
    creator: task.creator,
    contentCid: task.contentCid,
    reward: formatTaskReward(task.reward),
    createdAt: toEpochSeconds(task.createdAt),
    updatedAt: toEpochSeconds(task.updatedAt),
    status: task.status as TaskStatus,
    submissionCount: task.submissionCount,
    submissions: task.submissions.map((sub) => ({
      submitter: sub.submitter,
      resultCid: sub.resultCid,
      // Info: (20261015 - Luphia) 原始 token 數，不再經過 formatEther 換算
      consumedTokens: sub.consumedTokens.toString(),
      isRejected: sub.isRejected,
      subIndex: sub.subIndex,
    })),
  };
}

// Info: (20261015 - Luphia) 管理後台看板：新到舊，提交依序排列（repo 已排序）
export async function listAdminTasks(): Promise<ITask[]> {
  const { tasks } = await missionBoardRepo.listTasks({});
  return tasks.map(toAdminTask);
}

/**
 * Info: (20261015 - Luphia) 清掉 missions / issues 底下對不到任何任務的資料夾。
 *
 * 原本以「合約位址相符且鏈上有這個 taskId」判斷；現在合格的資料夾名稱只有
 * `missionFolderName(DB 裡存在的 id)`。舊鏈留下的 `{合約位址}_{taskId}` 與
 * 沒有底線的殘骸都對不到，會被清掉 —— 與原本「位址不符就刪」的行為一致。
 */
export async function garbageCollectMissionFolders(): Promise<{
  deleted: number;
  details: string[];
}> {
  const validFolders = new Set(
    (await missionBoardRepo.listTaskIds()).map((id) => missionFolderName(id)),
  );

  const directoriesToClean = ["missions", "issues"];
  const deletedFolders: string[] = [];

  for (const dirName of directoriesToClean) {
    const dirPath = path.join(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ process.cwd(),
      dirName,
    );

    let folders: import("fs").Dirent[] = [];
    try {
      folders = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      // Info: (20260426 - Luphia) Directory doesn't exist
      continue;
    }

    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      if (validFolders.has(folder.name)) continue;

      await fs.rm(
        path.join(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ dirPath,
          folder.name,
        ),
        { recursive: true, force: true },
      );
      deletedFolders.push(`${dirName}/${folder.name}`);
    }
  }

  return { deleted: deletedFolders.length, details: deletedFolders };
}

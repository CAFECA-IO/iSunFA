/**
 * Info: (20261015 - Luphia) 任務看板（`MissionTask` / `MissionSubmission`）的常數。
 *
 * 取代鏈上 MissionBoard 合約；數值與合約的 `enum TaskStatus` 一致，
 * 讓 worker 管線（issue → planner → executor → commitor → validator → closer → recorder）
 * 只換資料來源、不改狀態判斷。
 */
export const MISSION_TASK_STATUS = {
  OPEN: 0,
  PENDING_REVIEW: 1,
  DISPUTED: 2,
  CLOSED: 3,
} as const;

export type MissionTaskStatus =
  (typeof MISSION_TASK_STATUS)[keyof typeof MISSION_TASK_STATUS];

/**
 * Info: (20261015 - Luphia) 任務在 ISSUE_DIR / MISSION_DIR 下的資料夾前綴。
 *
 * 原本是 `${MissionBoard 合約位址}_${taskId}`。改用固定前綴，讓新舊資料夾不會撞名：
 * 舊鏈的 taskId 從 0 起算，新的 DB 流水號從 1 起算，兩者都可能出現同一個數字。
 * recorder 以最後一段 `_` 之後解析 taskId，因此前綴本身不得含 `_`。
 */
export const MISSION_DIR_PREFIX = "local";

export function missionFolderName(taskId: number | bigint | string): string {
  return `${MISSION_DIR_PREFIX}_${taskId.toString()}`;
}

/**
 * Info: (20261015 - Luphia) 反解 `missionFolderName`；不是本看板的資料夾回 null。
 *
 * 舊鏈留下的 `{合約位址}_{taskId}` 資料夾也會回 null：那些 taskId 指的是已退役的鏈上任務，
 * 與 DB 流水號可能同號，worker 拿它們去查 DB 會操作到別人的任務。
 */
export function parseMissionFolderName(name: string): number | null {
  const prefix = `${MISSION_DIR_PREFIX}_`;
  if (!name.startsWith(prefix)) return null;
  const idPart = name.slice(prefix.length);
  if (!/^\d+$/.test(idPart)) return null;
  const id = Number(idPart);
  return Number.isSafeInteger(id) ? id : null;
}

// Info: (20261015 - Luphia) 平台自己就是任務的建立者與執行者，不再有鏈上位址
export const MISSION_PLATFORM_ACTOR = "platform";

/**
 * Info: (20261015 - Luphia) 任務懸賞的最小單位位數。
 *
 * `MissionTask.reward` 沿用合約的 wei 刻度（18 位小數），讓舊資料與畫面換算方式一致；
 * 懸賞已不涉及任何代幣轉移，只是紀錄「這筆任務當時估的價」。
 */
export const MISSION_REWARD_DECIMALS = 18;

// Info: (20261015 - Luphia) 一筆任務最多被拒絕幾次就放棄（closer 寫 giveup.md 的門檻）
export const MISSION_MAX_REJECTIONS = 3;

// Info: (20261015 - Luphia) 管理後台對任務看板送出的動作
export const MISSION_ADMIN_ACTION = {
  CANCEL: "cancel",
  BUMP: "bump",
  GC: "gc",
} as const;

export type MissionAdminAction =
  (typeof MISSION_ADMIN_ACTION)[keyof typeof MISSION_ADMIN_ACTION];

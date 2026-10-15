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

// Info: (20261015 - Luphia) 平台自己就是任務的建立者與執行者，不再有鏈上位址
export const MISSION_PLATFORM_ACTOR = "platform";

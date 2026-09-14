import {
  COMPUTE_NODE_FORBIDDEN_ENV_KEYS,
  COMPUTE_NODE_FORBIDDEN_ENV_PREFIXES,
  DEFAULT_MISSION_DIR,
} from "@/constants/worker_node";

/**
 * Info: (20260914 - Luphia) 運算節點啟動期的**純函式**判斷（PR #6650 review
 * 需修-7／需修-8）。抽出來是為了讓「兩個 MISSION_DIR 來源不一致」與「該抹掉
 * 哪些鍵」有直接的行為測試，進入點只負責把結果變成 exit(1) 或 delete。
 * 本模組零 prisma，活在運算節點的匯入圖裡。
 */

export interface IMissionDirMismatch {
  worker: string;
  priority: string;
}

/**
 * Info: (20260914 - Luphia) `MISSION_DIR` 有兩個來源：executor 讀 `.env.worker`，
 * planner／commitor／closer 讀 `getPriorityEnvConfig()`。兩者在純運算節點上會
 * 收斂到同一個檔案（後者的 fallback），但在同時有系統 `.env` 的機器上可能分岔——
 * 那時 planner 寫 A 目錄、executor 掃 B 目錄，任務靜默停住。這裡回 mismatch，
 * 進入點據此 fail fast。兩邊缺席都視為預設值：缺席不是分岔。
 */
export const resolveMissionDirMismatch = (
  workerConfig: Record<string, string>,
  priorityConfig: Record<string, string>,
): IMissionDirMismatch | null => {
  const worker = workerConfig.MISSION_DIR || DEFAULT_MISSION_DIR;
  const priority = priorityConfig.MISSION_DIR || DEFAULT_MISSION_DIR;
  return worker === priority ? null : { worker, priority };
};

/**
 * Info: (20260914 - Luphia) 從 env 物件抹掉運算節點不得持有的鍵，回傳抹掉了哪些。
 * 對傳入物件就地修改（呼叫端傳 `process.env`）；回傳清單讓進入點能記錄
 * 「這台機器的 shell 帶進了什麼」——那是部署缺陷的線索，不該靜默吞掉。
 */
export const scrubForbiddenComputeEnv = (
  env: Record<string, string | undefined>,
): string[] => {
  const removed: string[] = [];
  Object.keys(env).forEach((key) => {
    const forbidden =
      (COMPUTE_NODE_FORBIDDEN_ENV_KEYS as readonly string[]).includes(key) ||
      COMPUTE_NODE_FORBIDDEN_ENV_PREFIXES.some((prefix) =>
        key.startsWith(prefix),
      );
    if (forbidden) {
      delete env[key];
      removed.push(key);
    }
  });
  return removed.sort();
};

import {
  COMPUTE_NODE_FORBIDDEN_ENV_KEYS,
  COMPUTE_NODE_FORBIDDEN_ENV_PREFIXES,
  COMPUTE_NODE_REQUIRED_ENV_KEYS,
  COMPUTE_NODE_RESERVED_ENV_KEYS,
} from "@/constants/worker_node";

/**
 * Info: (20260914 - Luphia) 運算節點啟動期的**純函式**判斷（PR #6650 review
 * 需修-8／三輪需修-4）。抽出來是為了讓「該抹掉哪些鍵」與「哪些必要值缺席」
 * 有直接的行為測試，進入點（`compute_node_bootstrap`）只負責把結果變成
 * exit(1) 或 delete。本模組零 prisma，活在運算節點的匯入圖裡。
 *
 * Info: (20260914 - Luphia) 原本這裡還有 `resolveMissionDirMismatch`（兩個
 * MISSION_DIR 來源的一致性檢查）。三輪 review 之後 `getPriorityEnvConfig()`
 * 在 compute 角色下只看 `.env.worker`，兩個來源成為同一個檔案，檢查沒有對象了
 *（而且它只比一個鍵，`NEXT_PUBLIC_MISSION_BOARD_ADDRESS` 分岔照樣過）。
 */

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

/**
 * Info: (20260914 - Luphia) 必要鍵裡**值為空**的那些（review 三輪需修-4）。
 * 判值不判鍵：`KEY=` 與沒有那一行對節點是同一回事。空白字元也算空——
 * 一個 `" "` 的 RPC URL 只會在第一次讀鏈時以更難懂的方式失敗。
 */
export const missingRequiredComputeEnv = (
  env: Record<string, string | undefined>,
): string[] =>
  COMPUTE_NODE_REQUIRED_ENV_KEYS.filter(
    (key) => (env[key] ?? "").trim() === "",
  );

export interface IWorkerFileApplyResult {
  /** Info: (20260917 - Luphia) 檔案值蓋掉了 shell 既有值的鍵 */
  overridden: string[];
  /** Info: (20260917 - Luphia) 檔案裡出現、但屬於進入點宣告而被跳過的鍵 */
  reserved: string[];
}

/**
 * Info: (20260917 - Luphia) 把 `.env.worker` 的解析結果寫進 `process.env`（五輪 review
 * 需修-5）。檔案值**覆寫** shell 值（shell 不是這個節點的設定來源），但
 * `COMPUTE_NODE_RESERVED_ENV_KEYS`（節點角色旗標）**跳過**：那是進入點在寫回之前
 * 設的宣告，檔案不得改寫它。抽成純函式是為了讓「保留鍵真的沒被寫回」有直接的
 * 行為測試，而不是靠讀 bootstrap 的原始碼。
 */
export const applyWorkerFileToProcessEnv = (
  workerFile: Record<string, string>,
  env: Record<string, string | undefined>,
): IWorkerFileApplyResult => {
  const overridden: string[] = [];
  const reserved: string[] = [];
  Object.entries(workerFile).forEach(([key, value]) => {
    if ((COMPUTE_NODE_RESERVED_ENV_KEYS as readonly string[]).includes(key)) {
      reserved.push(key);
      return;
    }
    if (env[key] !== undefined && env[key] !== value) overridden.push(key);
    env[key] = value;
  });
  return { overridden: overridden.sort(), reserved: reserved.sort() };
};

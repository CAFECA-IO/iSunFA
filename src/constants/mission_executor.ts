/**
 * Info: (20260811 - Luphia) Mission executor 的檔案狀態機參數。
 *
 * 這些數值原本以字面值散在 mission.executor.service.ts 內，其中「1 小時」那個常數
 * 同時承擔了兩件互不相關的事，而那正是 20260811 事故的根源：
 *
 * 1. 「一次執行最長可能跑多久」——用來判斷鎖是否還有效
 * 2. 「持有者死掉之後最快多久能被接手」
 *
 * 綁在一起的後果是：worker 被強制中斷（SIGKILL、關掉終端機）留下孤兒鎖時，
 * 那個 mission 必須整整等一小時才會被別人撿起來，而鎖的持有者早就不存在了。
 * 現在改用 heartbeat 分開這兩件事：存活由 heartbeat 表示，執行時長不再受限於同一個數字。
 */

// Info: (20260811 - Luphia) 鎖檔名稱（沿用既有名稱，與舊版檔案相容）
export const MISSION_LOCK_FILE_NAME = "running";

/**
 * Info: (20260811 - Luphia) 持有鎖的 worker 每隔多久更新一次 heartbeat。
 * 15 秒足夠稀疏（不造成可觀的檔案寫入），也足夠密集（讓失聯在一分半內就能被判定）。
 */
export const MISSION_LOCK_HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Info: (20260811 - Luphia) heartbeat 超過這個時間沒更新就視為失聯。
 * 取 6 個心跳週期：允許 GC 暫停、磁碟抖動、事件迴圈短暫壅塞造成的漏拍，
 * 而不會把正常執行中的 worker 誤判為死亡（誤判的代價是同一個 mission 被執行兩次）。
 */
export const MISSION_LOCK_STALE_AFTER_MS = 90_000;

/**
 * Info: (20260811 - Luphia) 最後防線：不論持有者看起來是否存活，超過這個時間一律回收。
 *
 * 為什麼還需要它——「持有者是否存活」只在同一台機器上驗得出來（比對 pid）。
 * 跨機器、或 pid 剛好被新行程重用時，我們無法證明它已經死了。那些情況就退回
 * 舊版的行為：等一小時。它不再是常態路徑，只是無法判斷時的保底。
 */
export const MISSION_LOCK_HARD_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Info: (20260811 - Luphia) 連續失敗幾次就停止重試（既有行為，改為具名常數）。
 * 對應 `failed_*.md` 的數量；達到上限後 executor 不再撿起該 mission。
 */
export const MISSION_MAX_EXECUTION_FAILURES = 3;

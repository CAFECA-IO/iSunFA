/**
 * Info: (20260914 - Luphia) worker 節點角色與其邊界常數（PR #6650 review 阻-1／阻-3／需修-7／需修-8）。
 *
 * 行程拆成「外部運算節點」與「內部維運節點」之後，隔離要靠**程式結構**而不是
 * 靠「檔案剛好不存在」——這裡收斂三件事：
 *
 * 1. 節點角色旗標：運算節點在進入點就把自己標成 COMPUTE，`lib/prisma` 在載入時
 *    看到這個旗標**直接拋錯**。匯入圖掃描（worker_node_isolation.test.ts）只守得住
 *    靜態 import，`await import()` 走得到的執行期路徑要靠這個旗標守。
 * 2. 運算節點不得持有的信任根：`.env.worker` 之外若有 shell export 進來的
 *    `DATABASE_URL` 等鍵，進入點主動抹掉——「不吃系統 env」要是程式碼的性質。
 * 3. MISSION_DIR 的預設值：五支服務各自寫 `"missions"` 字面值（CLAUDE.md §3），
 *    收斂成一個常數，進入點才能做「兩個來源必須一致」的檢查。
 */

export const WORKER_NODE_ROLE_ENV = "ISUNFA_WORKER_NODE_ROLE";

export const WORKER_NODE_ROLE = {
  COMPUTE: "compute",
  OPS: "ops",
} as const;

export type WorkerNodeRole =
  (typeof WORKER_NODE_ROLE)[keyof typeof WORKER_NODE_ROLE];

export const DEFAULT_MISSION_DIR = "missions";

/**
 * Info: (20260914 - Luphia) 運算節點啟動時要從 `process.env` 抹掉的鍵。
 *
 * 明列而不是「只留白名單」：Node 自己與 tsx 需要 PATH／HOME 之類的鍵，
 * 白名單會把它們一起殺掉。這份清單的判準是「持有它就等於拿到主系統的信任根」。
 * 前綴那一項涵蓋 SUPER_ADMIN_PUB_X／PUB_Y 與日後同族的新鍵。
 */
export const COMPUTE_NODE_FORBIDDEN_ENV_KEYS = [
  "DATABASE_URL",
  "SECRET_VAULT_MASTER_KEY",
  "DEWT_PRIVATE_KEY_PEM",
] as const;

export const COMPUTE_NODE_FORBIDDEN_ENV_PREFIXES = ["SUPER_ADMIN_"] as const;

/**
 * Info: (20260914 - Luphia) 上鏈提交被拒絕幾次算放棄（review 需修-6）。
 *
 * 原本寫在 `mission.closer.service.ts` 的 `3n` 字面值。recorder 現在也要用同一個
 * 判準從鏈上推導「已放棄」（兩個節點不共用磁碟，`giveup.md` 過不了界），
 * 兩處各寫一個 3 的話遲早分岔——而分岔的症狀是訂單永久卡住。
 */
export const MISSION_GIVE_UP_REJECTION_THRESHOLD = 3;

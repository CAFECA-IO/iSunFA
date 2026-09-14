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
 *    收斂成一個常數。
 *
 * Info: (20260914 - Luphia) 三輪 review 之後旗標的**設定時點**改了：以上三件由
 * `lib/worker/compute_node_bootstrap`（副作用模組）在進入點的**第一個 import**
 * 執行——ESM 依匯入順序求值，這是唯一能保證「服務圖載入前旗標已設」的位置；
 * 寫在進入點檔內的語句都在整個靜態圖之後才跑。旗標同時決定
 * `getPriorityEnvConfig()` 的解析（compute → 只看 `.env.worker`），於是
 * 「MISSION_DIR 兩個來源一致」從啟動檢查變成結構：兩個來源是同一個檔案。
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
 * Info: (20260914 - Luphia) 運算節點啟動時**值必須非空**的鍵（review 三輪需修-4）。
 *
 * 第一版的 fail fast 判的是「檔案有沒有鍵」——`.env.worker.example` 五個鍵全是
 * 空值，照文件 `cp` 過去就通過檢查，然後 planner 對空字串位址每 tick 拋錯被吞、
 * executor 拿空金鑰把付費任務燒成 giveup。缺**檔**與缺**值**是同一件事：
 * 這台機器沒部署好，該在啟動時退出，不該在任務上失敗。
 *
 * `MISSION_DIR`／`MODEL` 有程式碼預設值，不在清單內。
 */
export const COMPUTE_NODE_REQUIRED_ENV_KEYS = [
  "GEMINI_API_KEY",
  "NEXT_PUBLIC_RPC_URL",
  "NEXT_PUBLIC_MISSION_BOARD_ADDRESS",
] as const;

/**
 * Info: (20260914 - Luphia) 上鏈提交被拒絕幾次算放棄（review 需修-6）。
 *
 * 原本寫在 `mission.closer.service.ts` 的 `3n` 字面值。recorder 現在也要用同一個
 * 判準從鏈上推導「已放棄」（兩個節點不共用磁碟，`giveup.md` 過不了界），
 * 兩處各寫一個 3 的話遲早分岔——而分岔的症狀是訂單永久卡住。
 */
export const MISSION_GIVE_UP_REJECTION_THRESHOLD = 3;

/**
 * Info: (20260914 - Luphia) 每份 mission.json 內全球係數快照的體積上界（review 二輪中-2）。
 *
 * 量過的數字（以 `serializeGlobalCoefficients` 同一支序列化，靜態字典 1,337 筆）：
 * compact `JSON.stringify` 343,828 bytes；**出貨形狀**（`issue.service` 以
 * indent-2 序列化整份 mission.json，快照巢狀在 `prerequisiteData` 下）456,230
 * bytes，是 compact 的 1.33 倍。開發機 DB 的全球係數 1,371 列，線上只會更大
 *（admin 匯入＋自訂）。快照隨**每一份** mission 上傳 IPFS：200 張憑證的訂單
 * ≈ 91 MB。第一版註解寫「多帶一份沒有代價」——那是錯的，代價是乘以 N；
 * 第二版量的是 compact（review 三輪需修-8），量到 1 MB 過關的字典實際上傳
 * 1.33 MB——現在量的是出貨形狀。
 *
 * 1 MB 約是現況的 2.3 倍：留成長空間，但字典失控（匯入腳本重複跑、欄位膨脹）時
 * 在**發包端**就大聲拒發，而不是每份 mission 靜默多背幾 MB。超過時該做的是
 * 縮字典或改成按需篩選（設計取捨，見 issue.service 的註解），不是調大這個數字。
 */
export const MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES = 1024 * 1024;

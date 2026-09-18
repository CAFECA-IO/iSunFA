/**
 * Info: (20260914 - Luphia) 啟動邊界在 `compute_node_bootstrap`，且必須是**第一個 import**
 *（review 三輪需修-7）：ESM 依匯入順序求值，這是唯一能讓「角色旗標已設、信任根
 * 已抹、`.env.worker` 已載」發生在服務圖之前的位置。第一版把旗標寫在本檔的語句
 * 裡並註解「靜態圖零 prisma 所以沒關係」——那句對 prisma 成立，對「圖裡模組層級
 * 讀 env」不成立，抹除變成化妝。
 */
import "@/lib/worker/compute_node_bootstrap";
import { processNext as processMissionPlannerNext } from "@/services/mission.planner.service";
import { processNext as processMissionExecutorNext } from "@/services/mission.executor.service";
import { processNext as processMissionCommitorNext } from "@/services/mission.commitor.service";
import { processNext as processMissionCloserNext } from "@/services/mission.closer.service";
import { installWorkerShutdownHandlers } from "@/lib/worker/shutdown";
import { startServiceLoop } from "@/lib/worker/service_loop";

const NODE_NAME = "ComputeNode";

/**
 * Info: (20260812 - Luphia) 外部運算節點：mission 管線，無資料庫、無系統 `.env`。
 *
 * ## 為什麼要與維運任務分開
 *
 * `async_workers/00_async_worker_overview.md` 劃下的隔離是**防提示詞注入的基礎**：
 * 這個節點處理使用者上傳的憑證內容，即使注入成功也必須穿不過實體網路邊界。
 * 而在拆分之前，同一個行程裡還跑著 `TransactionTracker`、`WalletGuardian`、
 * 訂閱續約 —— 那些必須連資料庫，於是「Executor 沒有資料庫權限」在程式碼層面
 * 只是一句話：行程有連線，Executor 只是剛好沒用。
 *
 * 拆開之後那句話變成部署事實：這個行程的容器／機器**不需要**（也不該有）
 * 資料庫網路可達性與憑證。
 *
 * ## 這四個迴圈為什麼在一起
 *
 * planner → executor → commitor → closer 是同一個 `MISSION_DIR` 上的檔案狀態機，
 * 必須共用同一個檔案系統。四者都不碰資料庫（`worker_node_isolation.test.ts`）。
 *
 * ## 設定
 *
 * 只讀 `.env.worker`（見 `.env.worker.example`）。不吃系統 `.env` —— 那份裡有
 * `DATABASE_URL`、`SECRET_VAULT_MASTER_KEY`、`SUPER_ADMIN_*`，一個處理外部輸入的
 * 節點持有信任根，等於把隔離的意義抵銷掉。
 *
 * Info: (20260914 - Luphia) 「不吃系統 `.env`」的機制（review 三輪阻-3）：角色旗標
 * 讓 `getPriorityEnvConfig()` 在本行程內只解析 `.env.worker`——planner／commitor／
 * closer 一行不改，同機部署（三個 pm2 app 共用 cwd、系統 `.env` 就在旁邊）也讀
 * 不到它。前兩版靠「`.env.worker` 排第三順位」，在 shipped 的形態下從未生效。
 * 也因此 executor（直接讀 `.env.worker`）與其餘三支解析到同一個檔案，
 * 「MISSION_DIR 兩個來源一致」不再需要啟動檢查。
 */
async function runComputeNode() {
  // Info: (20260811 - Luphia) 兩段式中斷 + 結束前釋放 mission 執行鎖
  installWorkerShutdownHandlers(NODE_NAME);

  console.log(`[${NODE_NAME}] Starting mission pipeline loops...`);

  await Promise.all([
    startServiceLoop(NODE_NAME, "MissionPlanner", () =>
      processMissionPlannerNext(),
    ),
    startServiceLoop(NODE_NAME, "MissionExecutor", () =>
      processMissionExecutorNext(),
    ),
    startServiceLoop(NODE_NAME, "MissionCommitor", () =>
      processMissionCommitorNext(),
    ),
    startServiceLoop(NODE_NAME, "MissionCloser", () =>
      processMissionCloserNext(),
    ),
  ]);

  console.log(`[${NODE_NAME}] Stopped.`);
  process.exit(0);
}

runComputeNode().catch((err) => {
  console.error(`[${NODE_NAME}] Fatal error:`, err);
  process.exit(1);
});

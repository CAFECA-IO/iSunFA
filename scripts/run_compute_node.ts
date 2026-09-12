import { processNext as processMissionPlannerNext } from "@/services/mission.planner.service";
import { processNext as processMissionExecutorNext } from "@/services/mission.executor.service";
import { processNext as processMissionCommitorNext } from "@/services/mission.commitor.service";
import { processNext as processMissionCloserNext } from "@/services/mission.closer.service";
import { installWorkerShutdownHandlers } from "@/lib/worker/shutdown";
import { startServiceLoop } from "@/lib/worker/service_loop";
import { ENV_WORKER_PATH, loadWorkerEnvConfig } from "@/services/env.service";

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
 * 必須共用同一個檔案系統。四者都不碰資料庫（已逐一驗證匯入圖）。
 *
 * ## 設定
 *
 * 只讀 `.env.worker`（見 `.env.worker.example`）。不吃系統 `.env` —— 那份裡有
 * `DATABASE_URL`、`SECRET_VAULT_MASTER_KEY`、`SUPER_ADMIN_*`，一個處理外部輸入的
 * 節點持有信任根，等於把隔離的意義抵銷掉。
 */
async function loadNodeEnv(): Promise<void> {
  const config = await loadWorkerEnvConfig();
  const keys = Object.keys(config);

  if (keys.length === 0) {
    console.error(
      `[${NODE_NAME}] No configuration found at ${ENV_WORKER_PATH}. ` +
        "This node does not fall back to the system .env — copy .env.worker.example and fill it in.",
    );
    return;
  }

  keys.forEach((key) => {
    process.env[key] = config[key];
  });
  console.log(`[${NODE_NAME}] Loaded ${keys.length} settings from .env.worker`);
}

async function runComputeNode() {
  await loadNodeEnv();

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

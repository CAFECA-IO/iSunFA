import { processNext as processMissionPlannerNext } from "@/services/mission.planner.service";
import { processNext as processMissionExecutorNext } from "@/services/mission.executor.service";
import { processNext as processMissionCommitorNext } from "@/services/mission.commitor.service";
import { processNext as processMissionCloserNext } from "@/services/mission.closer.service";
import { installWorkerShutdownHandlers } from "@/lib/worker/shutdown";
import { startServiceLoop } from "@/lib/worker/service_loop";
import {
  ENV_WORKER_PATH,
  getPriorityEnvConfig,
  loadWorkerEnvConfig,
} from "@/services/env.service";
import {
  resolveMissionDirMismatch,
  scrubForbiddenComputeEnv,
} from "@/lib/worker/node_env";
import {
  WORKER_NODE_ROLE,
  WORKER_NODE_ROLE_ENV,
} from "@/constants/worker_node";

/**
 * Info: (20260914 - Luphia) 節點角色旗標（PR #6650 review 阻-3）：`lib/prisma`
 * 在載入時看到 compute 就拋錯，是匯入圖掃描之外的第二道防線。
 *
 * 靜態 import 在 ESM 裡會先於這一行執行——那沒關係：**靜態圖零 prisma** 由
 * `worker_node_isolation.test.ts` 保證，靜態載入階段本來就碰不到它。這個旗標
 * 守的是啟動之後才走到的**動態**路徑（`await import()`），那些都發生在本行之後。
 * 兩層各守一半，合起來才是「運算節點不會載入資料庫用戶端」。
 */
process.env[WORKER_NODE_ROLE_ENV] = WORKER_NODE_ROLE.COMPUTE;

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
 *
 * Info: (20260914 - Luphia) 三件事改成 fail fast（review 需修-7／需修-8）：
 *
 * 1. **缺 `.env.worker` 直接退出**。原本 warn 後續跑：四個迴圈照常啟動、
 *    `GEMINI_API_KEY` 是 undefined、每筆任務在 ChatService 拋錯、累積三次拒絕
 *    後 closer 寫 `giveup.md`——付費分析被一個缺檔報銷掉，而 log 裡只有一行 warn。
 *    「缺整份設定檔」與「單一任務缺金鑰」是兩件事：後者不該停掉不需要 LLM 的
 *    任務（known_issues 的既有立場），前者代表這台機器根本沒部署好。
 * 2. **抹掉繼承來的信任根**。原本把 `.env.worker` 併進繼承的 `process.env`，
 *    於是在有 `export DATABASE_URL` 的機器上，「不吃系統 env」是靠檔案不存在
 *    維持的，不是靠程式碼。
 * 3. **MISSION_DIR 兩個來源必須一致**。executor 讀 `.env.worker`，其餘三支讀
 *    `getPriorityEnvConfig()`；在同時有系統 `.env` 的機器上兩者可能分岔——
 *    planner 寫 A 目錄、executor 掃 B 目錄，任務靜默停住。
 */
async function loadNodeEnv(): Promise<void> {
  const config = await loadWorkerEnvConfig();
  const keys = Object.keys(config);

  if (keys.length === 0) {
    console.error(
      `[${NODE_NAME}] No configuration found at ${ENV_WORKER_PATH}. ` +
        "This node does not fall back to the system .env — copy .env.worker.example and fill it in. Exiting.",
    );
    process.exit(1);
  }

  const removed = scrubForbiddenComputeEnv(process.env);
  if (removed.length > 0) {
    console.error(
      `[${NODE_NAME}] Removed trust-root keys inherited from the shell: ${removed.join(", ")}. ` +
        "A compute node must not carry these — fix the deployment environment.",
    );
  }

  keys.forEach((key) => {
    process.env[key] = config[key];
  });
  console.log(`[${NODE_NAME}] Loaded ${keys.length} settings from .env.worker`);

  const mismatch = resolveMissionDirMismatch(
    config,
    await getPriorityEnvConfig(),
  );
  if (mismatch) {
    console.error(
      `[${NODE_NAME}] MISSION_DIR mismatch: .env.worker says "${mismatch.worker}" but ` +
        `getPriorityEnvConfig() resolves "${mismatch.priority}". The executor and the ` +
        "planner/commitor/closer would work on different directories. Exiting.",
    );
    process.exit(1);
  }
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

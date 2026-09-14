import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import path from "path";
import fs from "fs";
import {
  WORKER_NODE_ROLE,
  WORKER_NODE_ROLE_ENV,
} from "@/constants/worker_node";
import { scrubForbiddenComputeEnv } from "@/lib/worker/node_env";

/**
 * Info: (20260812 - Luphia) 讀 `.env.worker`，不是系統的 `.env`。
 *
 * 這支是外部運算節點的單一 Executor 入口（由 `run_executor.ts` 併發啟動多份），
 * 與 `run_compute_node.ts` 屬同一類節點，設定來源必須一致 ——
 * 系統 `.env` 裡有 `DATABASE_URL`、`SECRET_VAULT_MASTER_KEY`、`SUPER_ADMIN_*`，
 * 一個處理使用者上傳內容的節點不該看得到那些。
 *
 * 保留 dotenv-expand:這支原本就支援 `${VAR}` 展開，換檔案不該順手改掉那個語意。
 */
const projectRoot = process.cwd();
const workerEnv = path.join(projectRoot, ".env.worker");

/**
 * Info: (20260914 - Luphia) 與 `run_compute_node.ts` 同一套邊界（review 阻-3／需修-8）：
 * 節點角色旗標讓 `lib/prisma` 在任何執行期路徑載到它時 fail fast；缺 `.env.worker`
 * 直接退出，不讓缺金鑰的 Executor 把付費任務燒成 giveup。
 *
 * Info: (20260914 - Luphia) 信任根抹除**也要在這裡**（review 二輪中-1）。
 * 第一版只在 `run_compute_node` 抹，而本檔由 `run_executor.ts` 以
 * `spawn(..., { env: { ...process.env } })` 啟動——完整繼承 shell 的 env，
 * `SECRET_VAULT_MASTER_KEY`／`DEWT_PRIVATE_KEY_PEM`／`SUPER_ADMIN_*` 是純值，
 * skill 程式碼 `process.env` 讀一下就有，`lib/prisma` 那道守門擋不到它們。
 * 這支正是「最貼近文件所述外部節點」的那一個，漏掉的偏偏是最外露的。
 * 順序：旗標 → 抹除 → 載 `.env.worker`（dotenv 不覆寫既有鍵，抹完再載才乾淨）。
 * 常數與 node_env 都是零 prisma 的 `@/` 模組，與 `run_compute_node` 同一份真值。
 */
process.env[WORKER_NODE_ROLE_ENV] = WORKER_NODE_ROLE.COMPUTE;
const removedTrustRoots = scrubForbiddenComputeEnv(process.env);
if (removedTrustRoots.length > 0) {
  console.error(
    `[Executor Worker] Removed trust-root keys inherited from the shell: ${removedTrustRoots.join(", ")}. ` +
      "A compute node must not carry these — fix the deployment environment.",
  );
}

if (fs.existsSync(workerEnv)) {
  const loaded = dotenv.config({ path: workerEnv });
  dotenvExpand.expand(loaded);
} else {
  console.error(
    `[Executor Worker] No configuration at ${workerEnv}. This node does not fall back to the system .env. Exiting.`,
  );
  process.exit(1);
}

// Info: (20260521 - Luphia) Import service, ensuring they are resolved using the project root paths
import { processNext as processMissionExecutorNext } from "../src/services/mission.executor.service";
import {
  installWorkerShutdownHandlers,
  isShuttingDown,
} from "../src/lib/worker/shutdown";

// Info: (20260521 - Luphia) Setup executor using argument ID
const id = process.argv[2];
if (!id || !/^[0-9a-z]{8}$/.test(id)) {
  console.error(`[Executor Worker] Invalid or missing executor ID: ${id}`);
  process.exit(1);
}

// Info: (20260521 - Luphia) Start service loop
async function startExecutorLoop() {
  console.log(`Executor loop started. Monitoring missions for tasks...`);

  // Info: (20260811 - Luphia) 兩段式中斷 + 結束前釋放 mission 執行鎖（見 lib/worker/shutdown）
  installWorkerShutdownHandlers(`Executor ${id}`);

  const intervalMs = 10000; // Info: (20260521 - Luphia) 10 seconds

  while (!isShuttingDown()) {
    try {
      await processMissionExecutorNext();
      if (isShuttingDown()) break;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(`Error in executor processNext:`, error);
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  }

  console.log(`Executor worker stopped.`);
  process.exit(0);
}

startExecutorLoop().catch((err) => {
  console.error(`Fatal error:`, err);
  process.exit(1);
});

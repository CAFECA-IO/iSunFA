import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import path from "path";
import fs from "fs";

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

if (fs.existsSync(workerEnv)) {
  const loaded = dotenv.config({ path: workerEnv });
  dotenvExpand.expand(loaded);
} else {
  console.error(
    `[Executor Worker] No configuration at ${workerEnv}. This node does not fall back to the system .env.`,
  );
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

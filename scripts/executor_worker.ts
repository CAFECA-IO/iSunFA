/**
 * Info: (20260812 - Luphia) 讀 `.env.worker`，不是系統的 `.env`。
 *
 * 這支是外部運算節點的單一 Executor 入口（由 `run_executor.ts` 併發啟動多份），
 * 與 `run_compute_node.ts` 屬同一類節點，設定來源必須一致 ——
 * 系統 `.env` 裡有 `DATABASE_URL`、`SECRET_VAULT_MASTER_KEY`、`SUPER_ADMIN_*`，
 * 一個處理使用者上傳內容的節點不該看得到那些。
 *
 * Info: (20260914 - Luphia) 啟動邊界（角色旗標、抹信任根、載 `.env.worker`、缺檔／
 * 缺值退出）全部在 `@/lib/worker/compute_node_bootstrap`，而且**必須是第一個 import**：
 * ESM 先求值整個靜態圖再跑本檔的語句，寫在這裡的任何一行都在服務圖載完之後
 *（review 三輪需修-7——前兩版的註解宣稱「旗標 → 抹除 → 載檔」在圖之前，是錯的，
 * 5/21 的「先載 `.env` 再 import」也是同一個誤解）。本檔由 `run_executor.ts` 以
 * `env: { ...process.env }` spawn，完整繼承 shell 的 env，是最需要這道邊界的入口。
 */
import "@/lib/worker/compute_node_bootstrap";
import { processNext as processMissionExecutorNext } from "@/services/mission.executor.service";
import {
  installWorkerShutdownHandlers,
  isShuttingDown,
} from "@/lib/worker/shutdown";

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

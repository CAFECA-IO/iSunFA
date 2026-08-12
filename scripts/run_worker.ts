import { scanPendingTransactions } from "@/services/order.tracker.service";
import { processNext as processIssueNext } from "@/services/issue.service";
import { processNext as processMissionPlannerNext } from "@/services/mission.planner.service";
import { processNext as processMissionExecutorNext } from "@/services/mission.executor.service";
import { processNext as processMissionCommitorNext } from "@/services/mission.commitor.service";
import { processNext as processMissionCloserNext } from "@/services/mission.closer.service";
import { processNext as processIssueValidatorNext } from "@/services/issue.validator.service";
import { issueRecorderService } from "@/services/issue.recorder.service";
import { syncExchangeRates } from "@/services/cron/exchange_rate.cron";
import { processAmortization } from "@/services/cron/amortization.worker.service";
import { runWalletGuardian } from "@/services/cron/wallet_audit.cron";
import { expireOverdueTeamSubscriptions } from "@/services/cron/subscription_expiry.cron";
import { processSubscriptionRenewals } from "@/services/cron/subscription_renewal.cron";
import {
  installWorkerShutdownHandlers,
  isShuttingDown,
} from "@/lib/worker/shutdown";
import { ENV_WORKER_PATH, loadWorkerEnvConfig } from "@/services/env.service";

/**
 * Info: (20260130 - Luphia)
 * Worker script to continuously process pending analysis tasks.
 * Run with: npx tsx scripts/workers.run.ts
 */
/**
 * Info: (20260811 - Luphia) 停止條件改讀共用的關機旗標（見 lib/worker/shutdown）。
 *
 * 原本每個迴圈各自 process.on("SIGINT")，13 個迴圈就掛 13 個 listener——
 * 超過 Node 的預設上限會噴 MaxListenersExceededWarning，而且每個迴圈只能管自己，
 * 沒有地方能在關機時統一釋放 mission 執行鎖。
 */
async function startServiceLoop(
  name: string,
  fn: () => Promise<unknown>,
  intervalMs = 10000,
) {
  while (!isShuttingDown()) {
    try {
      await fn();
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(`[Worker][${name}] Error:`, error);
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }
}

/**
 * Info: (20260812 - Luphia) worker 用自己的 `.env.worker`,不吃系統的 `.env`。
 *
 * 在任何 service 被呼叫之前就載進 `process.env`,理由是 worker 端有不少程式碼
 * 直接讀 `process.env` —— 先載好,它們拿到的就是 worker 自己的設定。
 *
 * **不 fallback 到系統 `.env`**:找不到自己的設定檔就大聲說,而不是悄悄改用
 * web 節點那份。共用會讓一個處理使用者上傳內容的節點看得到 `DATABASE_URL`、
 * `SECRET_VAULT_MASTER_KEY`、`SUPER_ADMIN_*` —— 那些它完全不該擁有。
 *
 * 為什麼缺檔案不直接 `process.exit`:同一個行程裡還有 `TransactionTracker`、
 * `WalletGuardian`、訂閱續約這些**必須**存取資料庫的任務,它們的設定來自別處
 * (見 `known_issues/executor_settings_isolation.md` 的「尚未拆分」一節)。
 * 現在就退出會讓既有部署一升級就整批停擺;所以這裡只大聲記錄,
 * 真正缺鍵的那個任務會在用到時自己失敗。
 */
async function loadWorkerEnv(): Promise<void> {
  const config = await loadWorkerEnvConfig();
  const keys = Object.keys(config);

  if (keys.length === 0) {
    console.error(
      `[Worker] No worker configuration found at ${ENV_WORKER_PATH}. ` +
        "The worker does not fall back to the system .env — copy .env.worker.example and fill it in.",
    );
    return;
  }

  keys.forEach((key) => {
    process.env[key] = config[key];
  });
  console.log(`[Worker] Loaded ${keys.length} settings from .env.worker`);
}

async function runWorker() {
  // Info: (20260812 - Luphia) 先載自己的設定，再啟動任何迴圈
  await loadWorkerEnv();

  // Info: (20260811 - Luphia) 兩段式中斷 + 結束前釋放 mission 執行鎖
  installWorkerShutdownHandlers("Worker");

  console.log("[Worker] Starting independent service loops...");

  await Promise.all([
    startServiceLoop("TransactionTracker", () => scanPendingTransactions()),
    startServiceLoop("IssueService", () => processIssueNext()),
    startServiceLoop("MissionPlanner", () => processMissionPlannerNext()),
    startServiceLoop("MissionExecutor", () => processMissionExecutorNext()),
    startServiceLoop("MissionCommitor", () => processMissionCommitorNext()),
    startServiceLoop("MissionCloser", () => processMissionCloserNext()),
    startServiceLoop("IssueValidator", () => processIssueValidatorNext()),
    startServiceLoop("IssueRecorder", () => issueRecorderService.processNext()),
    startServiceLoop(
      "ExchangeRateSync",
      () => syncExchangeRates(),
      8 * 60 * 60 * 1000,
    ),
    startServiceLoop(
      "AmortizationWorker",
      () => processAmortization(),
      60 * 60 * 1000,
    ),
    // Info: (20260807 - Luphia) 團隊錢包守恆勾稽 + 每日 merkle 錨定（ADR 015 C 案 Phase 1）
    startServiceLoop(
      "WalletGuardian",
      () => runWalletGuardian(),
      60 * 60 * 1000,
    ),
    // Info: (20260807 - Luphia) 訂閱到期降級 / 標記續訂（fail-closed 防線在扣費側即時生效）
    startServiceLoop(
      "SubscriptionExpiry",
      () => expireOverdueTeamSubscriptions(),
      60 * 60 * 1000,
    ),
    // Info: (20260807 - Luphia) autoRenew 自動扣款續訂（逾 3 天寬限期未成即降級 free）
    startServiceLoop(
      "SubscriptionRenewal",
      () => processSubscriptionRenewals(),
      60 * 60 * 1000,
    ),
  ]);

  console.log("[Worker] Stopped.");
  process.exit(0);
}

runWorker().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});

import { scanPendingTransactions } from "@/services/order.tracker.service";
import { processNext as processIssueNext } from "@/services/issue.service";
import { processNext as processIssueValidatorNext } from "@/services/issue.validator.service";
import { issueRecorderService } from "@/services/issue.recorder.service";
import { syncExchangeRates } from "@/services/cron/exchange_rate.cron";
import { processAmortization } from "@/services/cron/amortization.worker.service";
import { runWalletGuardian } from "@/services/cron/wallet_audit.cron";
import { expireOverdueTeamSubscriptions } from "@/services/cron/subscription_expiry.cron";
import { processSubscriptionRenewals } from "@/services/cron/subscription_renewal.cron";
import { installWorkerShutdownHandlers } from "@/lib/worker/shutdown";
import { startServiceLoop } from "@/lib/worker/service_loop";

const NODE_NAME = "OpsNode";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Info: (20260812 - Luphia) 內部維運節點：需要主資料庫寫入權限的常駐任務。
 *
 * 這裡的每一支都碰資料庫（逐一驗證過匯入圖）：訂單追蹤、議題流程、查帳核准、
 * 抄寫回帳本、匯率、攤提、錢包守恆勾稽、訂閱到期與續約。
 *
 * 與外部運算節點分開的理由見 `run_compute_node.ts` 的檔頭：
 * 那個節點處理使用者上傳的內容，不該連得到資料庫；而這裡正好相反 ——
 * 它的工作就是寫庫，所以它必須留在可信網段內，也因此**不得**執行
 * mission 管線那些吃外部輸入的任務。
 *
 * 設定沿用系統 `.env`（與拆分前相同）。
 */
async function runOpsNode() {
  // Info: (20260811 - Luphia) 兩段式中斷 + 結束前釋放 mission 執行鎖
  installWorkerShutdownHandlers(NODE_NAME);

  console.log(`[${NODE_NAME}] Starting maintenance loops...`);

  await Promise.all([
    startServiceLoop(NODE_NAME, "TransactionTracker", () =>
      scanPendingTransactions(),
    ),
    startServiceLoop(NODE_NAME, "IssueService", () => processIssueNext()),
    startServiceLoop(NODE_NAME, "IssueValidator", () =>
      processIssueValidatorNext(),
    ),
    startServiceLoop(NODE_NAME, "IssueRecorder", () =>
      issueRecorderService.processNext(),
    ),
    startServiceLoop(
      NODE_NAME,
      "ExchangeRateSync",
      () => syncExchangeRates(),
      8 * HOUR_MS,
    ),
    startServiceLoop(
      NODE_NAME,
      "AmortizationWorker",
      () => processAmortization(),
      HOUR_MS,
    ),
    // Info: (20260807 - Luphia) 團隊錢包守恆勾稽 + 每日 merkle 錨定（ADR 015 C 案 Phase 1）
    startServiceLoop(
      NODE_NAME,
      "WalletGuardian",
      () => runWalletGuardian(),
      HOUR_MS,
    ),
    // Info: (20260807 - Luphia) 訂閱到期降級 / 標記續訂（fail-closed 防線在扣費側即時生效）
    startServiceLoop(
      NODE_NAME,
      "SubscriptionExpiry",
      () => expireOverdueTeamSubscriptions(),
      HOUR_MS,
    ),
    // Info: (20260807 - Luphia) autoRenew 自動扣款續訂（逾 3 天寬限期未成即降級 free）
    startServiceLoop(
      NODE_NAME,
      "SubscriptionRenewal",
      () => processSubscriptionRenewals(),
      HOUR_MS,
    ),
  ]);

  console.log(`[${NODE_NAME}] Stopped.`);
  process.exit(0);
}

runOpsNode().catch((err) => {
  console.error(`[${NODE_NAME}] Fatal error:`, err);
  process.exit(1);
});

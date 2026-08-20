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
import { runFaithMemoryRetention } from "@/services/cron/faith_memory_retention.cron";
import { runLeaveBalanceReconcile } from "@/services/cron/leave_balance_reconcile.cron";
import {
  installWorkerShutdownHandlers,
  isShuttingDown,
} from "@/lib/worker/shutdown";

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

async function runWorker() {
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
    /**
     * Info: (20260817 - Luphia) 費思記憶的 90 天保留與刪除（條款 §3.7、隱私政策 §5）。
     * 每 6 小時對帳一次即足夠——承諾的粒度是「天」，而它天然冪等、可重入。
     */
    startServiceLoop(
      "FaithMemoryRetention",
      () => runFaithMemoryRetention(),
      6 * 60 * 60 * 1000,
    ),
    /**
     * Info: (20260820 - Julian) 額度快取的勾稽（ADR 022 §2.3、review 第 10 輪第 2 條）。
     *
     * 每小時一次而不是一天一次：`expiringSoonMinutes` 是相對於「今天」的量，
     * 日界一過就該重算，而一支一天只跑一次的迴圈沒有辦法保證它落在日界之後。
     * 重建本身冪等（依帳本重算並覆寫），多跑幾次只是多幾次全表加總。
     */
    startServiceLoop(
      "LeaveBalanceReconcile",
      () => runLeaveBalanceReconcile(),
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

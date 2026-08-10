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

/**
 * Info: (20260130 - Luphia)
 * Worker script to continuously process pending analysis tasks.
 * Run with: npx tsx scripts/workers.run.ts
 */
async function startServiceLoop(
  name: string,
  fn: () => Promise<unknown>,
  intervalMs = 10000,
) {
  let isRunning = true;
  process.on("SIGINT", () => {
    isRunning = false;
  });

  while (isRunning) {
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
  process.on("SIGINT", () => {
    console.log("\n[Worker] Stopping...");
  });

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

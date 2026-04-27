import { scanPendingTransactions } from "@/services/transaction.tracker.service";
import { processNext as processIssueNext } from "@/services/issue.service";
import { processNext as processMissionPlannerNext } from "@/services/mission.planner.service";
import { processNext as processMissionExecutorNext } from "@/services/mission.executor.service";
import { processNext as processMissionCommitorNext } from "@/services/mission.commitor.service";
import { processNext as processIssueValidatorNext } from "@/services/issue.validator.service";
import { issueRecorderService } from "@/services/issue.recorder.service";

/**
 * Info: (20260130 - Luphia)
 * Worker script to continuously process pending analysis tasks.
 * Run with: npx tsx scripts/workers.run.ts
 */
async function startServiceLoop(name: string, fn: () => Promise<unknown>, intervalMs = 10000) {
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
    startServiceLoop("IssueValidator", () => processIssueValidatorNext()),
    startServiceLoop("IssueRecorder", () => issueRecorderService.processNext()),
  ]);

  console.log("[Worker] Stopped.");
  process.exit(0);
}

runWorker().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});

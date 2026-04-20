import { transactionTrackerService } from "@/services/transaction.tracker.service";
import { missionIssuerService } from "@/services/mission.issuer.service";
import { missionPlannerService } from "@/services/mission.planner.service";
import { missionExecutorService } from "@/services/mission.executor.service";
import { missionCommitorService } from "@/services/mission.commitor.service";
import { missionValidatorService } from "@/services/mission.validator.service";
import { missionRecorderService } from "@/services/mission.recorder.service";

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
    startServiceLoop("TransactionTracker", () => transactionTrackerService.scanPendingTransactions()),
    startServiceLoop("MissionIssuer", () => missionIssuerService.processNext()),
    startServiceLoop("MissionPlanner", () => missionPlannerService.processNext()),
    startServiceLoop("MissionExecutor", () => missionExecutorService.processNext()),
    startServiceLoop("MissionCommitor", () => missionCommitorService.processNext()),
    startServiceLoop("MissionValidator", () => missionValidatorService.processNext()),
    startServiceLoop("MissionRecorder", () => missionRecorderService.processNext()),
  ]);

  console.log("[Worker] Stopped.");
  process.exit(0);
}

runWorker().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});

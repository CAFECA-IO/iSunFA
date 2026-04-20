import { taskRepo } from "@/repositories/task.repo";
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
async function runWorker() {
  console.log("[Worker] Starting Analysis Task Worker...");
  console.log("[Worker] Press Ctrl+C to stop.");

  try {
    const updated = await taskRepo.resetAllRunningTasks();
    if (updated.count > 0) {
      console.log(
        `[Worker] Recovered ${updated.count} interrupted RUNNING tasks back to PENDING for smooth continuation.`,
      );
    }
  } catch (err) {
    console.error("[Worker] Failed to reset running tasks on startup:", err);
  }

  let isRunning = true;

  // Info: (20260130 - Luphia) Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n[Worker] Stopping...");
    isRunning = false;
  });

  while (isRunning) {
    try {
      // Info: (20260418 - Luphia) 1. Check transactions first
      await transactionTrackerService.scanPendingTransactions();

      // Info: (20260420 - Luphia) 2. Run Decentralized Mission Engine Pipeline
      await missionIssuerService.processNext();
      await missionPlannerService.processNext();
      await missionExecutorService.processNext();
      await missionCommitorService.processNext();
      await missionValidatorService.processNext();
      await missionRecorderService.processNext();

      // Info: (20260130 - Luphia) Wait before next check to avoid tight loop
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.error("[Worker] Error in loop:", error);
      // Info: (20260130 - Luphia) Wait longer on error
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }

  console.log("[Worker] Stopped.");
  process.exit(0);
}

runWorker().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});

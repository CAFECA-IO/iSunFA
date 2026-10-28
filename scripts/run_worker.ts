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
import { scanResumableJobs } from "@/services/resumable_job.service";
import {
  runCompanyFinancialFactSync,
  runCompanyObservatoryCycle,
  runCompanyObservatoryPlanner,
} from "@/services/cron/company_observatory.cron";
import { JOB_RESUME_SCAN_INTERVAL_MS } from "@/constants/resumable_job";
import {
  OBSERVATORY_PROCESS_INTERVAL_MS,
  OBSERVATORY_SCHEDULE_POLL_MS,
} from "@/constants/company_observatory";
import {
  installWorkerShutdownHandlers,
  isShuttingDown,
  requestWorkerShutdown,
  sleepUnlessShuttingDown,
} from "@/lib/worker/shutdown";
import { BACKGROUND_WORKER_LEASE } from "@/constants/worker_lease";
import {
  createWorkerHolderId,
  releaseWorkerLease,
  startWorkerLeaseHeartbeat,
  waitForWorkerLease,
} from "@/services/worker_lease.service";

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
      await sleepUnlessShuttingDown(intervalMs);
    } catch (error) {
      console.error(`[Worker][${name}] Error:`, error);
      await sleepUnlessShuttingDown(60000);
    }
  }
}

async function runWorker() {
  // Info: (20260811 - Luphia) 兩段式中斷 + 結束前釋放 mission 執行鎖
  installWorkerShutdownHandlers("Worker");

  /**
   * Info: (20261015 - Luphia) 先拿 worker 租約（同一個資料庫只有一個 worker 在跑）。
   * `npm start`、`npm run swarm` 都會連同 worker 一起啟動，pm2 也可能另外跑一個——
   * 沒拿到的待命，持有者停止後接手。
   */
  const holderId = createWorkerHolderId();
  const log = (message: string) => console.log(`[Worker][Lease] ${message}`);
  const acquired = await waitForWorkerLease({
    name: BACKGROUND_WORKER_LEASE,
    holderId,
    shouldStop: isShuttingDown,
    log,
  });
  if (!acquired) {
    console.log("[Worker] Stopped before acquiring the lease.");
    process.exit(0);
  }
  log(`Acquired as ${holderId}.`);
  const stopHeartbeat = startWorkerLeaseHeartbeat({
    name: BACKGROUND_WORKER_LEASE,
    holderId,
    onLost: requestWorkerShutdown,
    log,
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
    /**
     * Info: (20260825 - Luphia) 暫停中的高耗點任務：額度回來了就翻成「可以繼續」
     *（issue #6714）。
     *
     * 等重置／加購點數／升級方案三條出路最後都收斂成同一句話——現在的餘額
     * 夠不夠做下一步。因此只有這一支迴圈，而不是三套偵測。
     *
     * ToDo: (20260827 - Luphia) 這支目前是「翻牌」而不是「接續」：它把
     * PAUSED 改成 RESUMABLE，而真正把剩下幾份跑完的是使用者按下「接著匯入」。
     * 付款完成後自動接續、以及跨裝置從 `GET /user/job` 認領，都還沒接上（issue #6714 續作）。
     * 這條註解原本聲稱「付款完成的那一頁會直接接續」——那段程式不存在，已改正。
     */
    startServiceLoop(
      "ResumableJobScan",
      () => scanResumableJobs(Date.now()),
      JOB_RESUME_SCAN_INTERVAL_MS,
    ),
    /**
     * Info: (20261015 - Luphia) 企業觀測站：每日補建待下載清單；每 10 分鐘下載與索引一小批。
     * 對外流量由逐主機限速控制（見 constants/company_observatory），失敗三次進死信。
     * Info: (20261028 - Luphia) 三支都先檢查後台的企業觀測站開關（預設關閉＝不收集）；
     * 每日工作改為每 10 分鐘檢查、到期才做，開關改了 10 分鐘內生效。
     */
    startServiceLoop(
      "CompanyObservatoryPlanner",
      () => runCompanyObservatoryPlanner(),
      OBSERVATORY_SCHEDULE_POLL_MS,
    ),
    startServiceLoop(
      "CompanyObservatory",
      () => runCompanyObservatoryCycle(),
      OBSERVATORY_PROCESS_INTERVAL_MS,
    ),
    // Info: (20261023 - Luphia) 財務數字每日同步（OpenAPI 只給最新一期，歷史靠每天留下來）
    startServiceLoop(
      "CompanyFinancialFacts",
      () => runCompanyFinancialFactSync(),
      OBSERVATORY_SCHEDULE_POLL_MS,
    ),
  ]);

  stopHeartbeat();
  await releaseWorkerLease({ name: BACKGROUND_WORKER_LEASE, holderId }).catch(
    (error: unknown) =>
      console.error("[Worker] Failed to release lease:", error),
  );
  console.log("[Worker] Stopped.");
  process.exit(0);
}

runWorker().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});

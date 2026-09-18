import { scanPendingTransactions } from "@/services/order.tracker.service";
import { processNext as processIssueNext } from "@/services/issue.service";
import { processNext as processIssueValidatorNext } from "@/services/issue.validator.service";
import { issueRecorderService } from "@/services/issue.recorder.service";
import { syncExchangeRates } from "@/services/cron/exchange_rate.cron";
import { processAmortization } from "@/services/cron/amortization.worker.service";
import { runWalletGuardian } from "@/services/cron/wallet_audit.cron";
import { expireOverdueTeamSubscriptions } from "@/services/cron/subscription_expiry.cron";
import { processSubscriptionRenewals } from "@/services/cron/subscription_renewal.cron";
import { runFaithMemoryRetention } from "@/services/cron/faith_memory_retention.cron";
import { syncPendingSubscriptionCards } from "@/services/subscription_nft.service";
import { SUBSCRIPTION_CARD_SYNC_INTERVAL_MS } from "@/constants/subscription_nft";
import { runLeaveBalanceReconcile } from "@/services/cron/leave_balance_reconcile.cron";
import { scanResumableJobs } from "@/services/resumable_job.service";
import { JOB_RESUME_SCAN_INTERVAL_MS } from "@/constants/resumable_job";
import { installWorkerShutdownHandlers } from "@/lib/worker/shutdown";
import { startServiceLoop } from "@/lib/worker/service_loop";

const NODE_NAME = "OpsNode";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Info: (20260812 - Luphia) 內部維運節點：需要主資料庫寫入權限的常駐任務。
 *
 * 這裡的每一支都碰資料庫（逐一驗證過匯入圖）：訂單追蹤、議題流程、查帳核准、
 * 抄寫回帳本、匯率、攤提、錢包守恆勾稽、訂閱到期與續約、費思記憶保留、
 * 訂閱會員卡同步、額度快取勾稽、可中斷任務掃描。
 *
 * Info: (20260907 - Luphia) 後四支是拆分之後 develop 陸續加進 `run_worker.ts`
 * 的（20260817〜0825），合併時依同一個判準歸到這一側：每一支都寫庫。
 * 新增常駐迴圈時請加在**這裡**（或 compute 側），`run_worker.ts` 只剩告示。
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
    /**
     * Info: (20260817 - Luphia) 費思記憶的 90 天保留與刪除（條款 §3.7、隱私政策 §5）。
     * 每 6 小時對帳一次即足夠——承諾的粒度是「天」，而它天然冪等、可重入。
     */
    startServiceLoop(
      NODE_NAME,
      "FaithMemoryRetention",
      () => runFaithMemoryRetention(),
      6 * HOUR_MS,
    ),
    /**
     * Info: (20260819 - Luphia) 訂閱會員卡（鏈上 NFT）同步。
     *
     * 鑄卡不放在付款履行路徑裡：那條路徑在交易內完成，鏈上寫入失敗會讓
     * 已收款的訂閱回報失敗，成功也要讓使用者多等數秒（見 subscription_nft.service）。
     * 訂閱一變更就在 DB 留待辦，這裡每分鐘補上。
     */
    startServiceLoop(
      NODE_NAME,
      "SubscriptionCardSync",
      () => syncPendingSubscriptionCards(Date.now()),
      SUBSCRIPTION_CARD_SYNC_INTERVAL_MS,
    ),
    /**
     * Info: (20260820 - Julian) 額度快取的勾稽（ADR 022 §2.3、review 第 10 輪第 2 條）。
     *
     * 每小時一次而不是一天一次：`expiringSoonMinutes` 是相對於「今天」的量，
     * 日界一過就該重算，而一支一天只跑一次的迴圈沒有辦法保證它落在日界之後。
     * 重建本身冪等（依帳本重算並覆寫），多跑幾次只是多幾次全表加總。
     */
    startServiceLoop(
      NODE_NAME,
      "LeaveBalanceReconcile",
      () => runLeaveBalanceReconcile(),
      HOUR_MS,
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
      NODE_NAME,
      "ResumableJobScan",
      () => scanResumableJobs(Date.now()),
      JOB_RESUME_SCAN_INTERVAL_MS,
    ),
  ]);

  console.log(`[${NODE_NAME}] Stopped.`);
  process.exit(0);
}

runOpsNode().catch((err) => {
  console.error(`[${NODE_NAME}] Fatal error:`, err);
  process.exit(1);
});

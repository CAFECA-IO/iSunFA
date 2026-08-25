/**
 * Info: (20260825 - Luphia) 可中斷／可接續任務的共用詞彙（設計書「可中斷任務」一節）。
 *
 * 起因是一個具體的事故：64 頁的溫盤報告匯入到一半點數用完，而前端逐章迴圈把
 * **任何**錯誤都當成解析失敗——於是使用者看到「以下章節解析失敗」，
 * 而真相是「錢用完了，那些章根本沒被解析過」。兩件事的處置完全相反：
 * 解析失敗要重試（可能再失敗），點數用完要**停下來**並告訴使用者怎麼補。
 *
 * 因此這裡的核心區分只有一個，而它值得一組專用的詞彙：
 *
 * > **暫停不是失敗。** 暫停的步驟一步都沒做、一點都沒扣，接續時從原地重跑即可。
 */

export const JOB_STATUS = {
  // Info: (20260825 - Luphia) 正在跑（有 in-flight 的步驟）
  RUNNING: "RUNNING",
  /**
   * Info: (20260825 - Luphia) 因為 `pauseReason` 停下來，剩餘步驟原封不動。
   * 這個狀態**不是**錯誤：使用者補上點數（或視窗重置）之後從這裡接續。
   */
  PAUSED: "PAUSED",
  /**
   * Info: (20260825 - Luphia) 暫停的原因已經消失（餘額夠了／視窗重置了），
   * 可以接續。與 `PAUSED` 分成兩個狀態，是為了讓「可以繼續了」這件事
   * 有一個**明確的時點**——畫面據此把橫幅從「已用完」換成「可以繼續」，
   * 而不是每次載入都自己去猜。
   */
  RESUMABLE: "RESUMABLE",
  // Info: (20260825 - Luphia) 全部步驟都有結果（含部分失敗）
  COMPLETED: "COMPLETED",
  // Info: (20260825 - Luphia) 使用者主動放棄；不再由 worker 掃描
  CANCELLED: "CANCELLED",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

// Info: (20260825 - Luphia) 還會被 worker 掃描、對使用者仍是「未完成」的狀態
export const JOB_OPEN_STATUSES: readonly JobStatus[] = [
  JOB_STATUS.RUNNING,
  JOB_STATUS.PAUSED,
  JOB_STATUS.RESUMABLE,
];

/**
 * Info: (20260825 - Luphia) 暫停的原因。每一種都對應一組**使用者做得到的事**——
 * 這是它與「錯誤碼」的差別：錯誤碼說明哪裡壞了，暫停原因說明怎麼繼續。
 */
export const JOB_PAUSE_REASON = {
  // Info: (20260825 - Luphia) 團隊額度用盡（402 TW_QUOTA_EXCEEDED）：等重置／加購／升級
  CREDITS_EXHAUSTED: "CREDITS_EXHAUSTED",
  /**
   * Info: (20260825 - Luphia) 需要個人付款才能繼續（402 TW_PERSONAL_PAYMENT_REQUIRED）：
   * 個人點數在鏈上、扣款要簽章，因此走「建單 → 付款 → 重送」，
   * 而那個「重送」正是接續。
   */
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
} as const;

export type JobPauseReason =
  (typeof JOB_PAUSE_REASON)[keyof typeof JOB_PAUSE_REASON];

/**
 * Info: (20260825 - Luphia) 任務型別。新增高耗點功能時在這裡登記一個代號，
 * 而不是各自發明一組狀態——「哪些功能可以中斷接續」要一眼看得完。
 */
export const JOB_TYPE = {
  // Info: (20260825 - Luphia) 智能溫盤：逐章匯入報告（每章一次 LLM 呼叫、各自計費）
  CARBON_REPORT_IMPORT: "CARBON_REPORT_IMPORT",
} as const;

export type JobType = (typeof JOB_TYPE)[keyof typeof JOB_TYPE];

/**
 * Info: (20260825 - Luphia) worker 掃描的間隔。
 *
 * 五分鐘：額度視窗的重置是 5 小時級距，而使用者加購點數之後**不必等這個迴圈**
 * ——付款成功的那一頁會直接呼叫接續。這支掃描是為了「人已經離開頁面」的情形，
 * 那時晚幾分鐘沒有差別。
 */
export const JOB_RESUME_SCAN_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Info: (20260825 - Luphia) 單次掃描處理的任務上限：一輪掃不完的下一輪接手。
 * 每一筆都要讀一次額度（含一次鏈上餘額查詢），不設上限會讓一次積壓
 * 變成一串同步的 RPC。
 */
export const JOB_RESUME_SCAN_BATCH = 50;

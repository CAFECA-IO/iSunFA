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
 * Info: (20260826 - Luphia) 每一種任務**實際的扣點模式**（review #6717 二輪第 3 條）。
 *
 * 這張表存在的理由是一個把整套機制變成裝飾品的錯：掃描行程原本用
 * 「額度足額」判斷「現在能不能繼續」，而匯入實際的扣點是**封頂放行**
 * （`allowPartial: true`，按 token 計量、結算時追補）。兩個判準的落差不是保守，
 * 是**永不觸發**——實測一份 2MB 的 PDF 單次預扣估算是 677 點，而
 * 免費 `min(10, 40)`、團隊 `min(100, 750)` 的視窗**永遠不可能足額**，
 * 於是那些任務永遠等不到「可以繼續」。只有企業版（或小檔）打得開。
 *
 * 判準必須與扣款端同一個模式，否則「可以繼續」與「真的會放行」是兩件事。
 * 新增任務型別時要在這裡宣告它的模式——那是一個**必須做的決定**，
 * 不是可以沿用預設值的參數。
 */
export const JOB_SPEND_MODE: Record<JobType, { allowPartial: boolean }> = {
  /**
   * Info: (20260826 - Luphia) 匯入按 token 計量且有結算步驟，因此餘額不足時
   * 封頂放行（見 `runBilledCarbonTask` 的 `allowPartial: true`）。
   * 「有餘額就跑得動」正是它的真實語意——一份跑不完的部分由結算追補。
   */
  [JOB_TYPE.CARBON_REPORT_IMPORT]: { allowPartial: true },
};

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

/**
 * Info: (20260827 - Luphia) 執行許可的租期（issue #6721）。
 *
 * 「誰現在跑得動這個任務」用一把**會過期的**許可，而不是一個布林旗標：
 * 分頁被強制關掉、瀏覽器當掉、電腦睡著時，沒有任何人會來釋放旗標——
 * 那會把使用者永久鎖在門外，而症狀是「按了沒反應」，最難自救的一種。
 *
 * 租約不需要新欄位：`status === RUNNING` 加上 `updatedAt` 的新鮮度就是租約，
 * 而檢查點（issue #6723）每做完一份就寫一次書籤，天然就是續租的心跳。
 *
 * 5 分鐘的取法：租期必須**大於**兩次心跳之間的最長間隔，也就是單一份的
 * 最長耗時（實測數十秒，含逾時重試留餘裕）。取太短會讓自己的租約在跑的
 * 過程中過期，另一個分頁就接手同一份任務——那正是這把鎖要防的事。
 */
export const JOB_CLAIM_TTL_MS = 5 * 60 * 1000;

/**
 * Info: (20260827 - Luphia) 取得執行許可的意圖（issue #6721）。
 *
 * 只影響「找不到任務算不算失敗」，不影響裁決——真正的裁決（有沒有人正在跑）
 * 無論哪種意圖都是同一條：
 *
 * - `RESUME`：要有一個沒做完的任務才有意義，找不到就是錯。
 * - `START`：這個資源上沒有任務、或上一個已經做完，都正常（重新匯入本來就會
 *   覆寫舊書籤）。但另一個分頁正在跑時一樣要擋，否則兩個分頁各自從第一份開始，
 *   兩份帳都要付。
 */
export const JOB_CLAIM_INTENT = {
  RESUME: "RESUME",
  START: "START",
} as const;

export type JobClaimIntent =
  (typeof JOB_CLAIM_INTENT)[keyof typeof JOB_CLAIM_INTENT];

/**
 * Info: (20260901 - Luphia) 客戶端對「換許可失敗」的判決分類（review #6726 阻-1）。
 *
 * 高-1 修了伺服器那一半（已取消的任務拿不到許可），而客戶端的 catch 把
 * `TW_JOB_CANCELLED`、`TW_JOB_ALREADY_COMPLETED`、403 全部當成「鎖自己壞掉」
 * 放行——伺服器明確說「不要跑」的判決被吞掉，剩下那幾份照送、點數照扣。
 * BroadcastChannel 不可用、或舊分頁開在另一台裝置上時，沒有任何一道擋得住。
 *
 * 四種判決的處置各不相同（這正是錯誤碼分成四個的理由）：
 *
 * - `BUSY`：別人正在跑——等一下再按，按鈕留著。
 * - `CANCELLED`：使用者自己說不做的——不跑，並讓畫面改口。
 * - `COMPLETED`：沒有東西可接續——不跑，並讓畫面改口。
 * - `FORBIDDEN`：這不是你的任務——不跑。
 *
 * **只有不在此列的失敗**（網路斷、伺服器自己壞掉）才放行：這把鎖是為了省錢，
 * 不是為了在它自己壞掉時把功能一起關掉。
 */
export const JOB_CLAIM_DENIAL = {
  BUSY: "BUSY",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type JobClaimDenial =
  (typeof JOB_CLAIM_DENIAL)[keyof typeof JOB_CLAIM_DENIAL];

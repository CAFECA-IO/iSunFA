/**
 * Info: (20260716 - Emily) Carbon API 限流常數(#6516)。
 * 維度:DeWT address × bucket;數值可由 env 覆蓋(部署時調參不改碼)。
 * 設計原則見 documents/engineering_guidelines/rate_limiting_guideline.md。
 */

export enum RateLimitBucketEnum {
  // Info: (20260716 - Emily) LLM 類(chat/draft):次數即成本,最嚴;分鐘 + 每日雙窗口(成本上限職責自 #6515 移入)
  LLM = "LLM",
  // Info: (20260716 - Emily) 上傳類(attachment):Laria 分片與儲存成本
  UPLOAD = "UPLOAD",
  // Info: (20260716 - Emily) 讀取類(history/sessions/report GET):寬鬆,防爬掃
  READ = "READ",
  // Info: (20260716 - Emily) 保存類(report PUT):autosave debounce 2s,上限需高於正常編輯節奏
  SAVE = "SAVE",
  // Info: (20260807 - Luphia) 費思訪客試用(未登入或未帶 teamId,不進計費管線;設計書 §5.3 guardrail 1)
  FAITH_GUEST = "FAITH_GUEST",
  /**
   * Info: (20260811 - Luphia) 託管代簽。這是資金授權原語,不是一般讀寫:
   * 每次呼叫做一次 AES-GCM 解密加兩次鏈上讀取,而且產出的是一份可直接送 bundler 的簽章。
   * 正常使用者一分鐘不會簽超過幾次,把上限壓低是為了讓「拿到 session 後批次索取簽章」
   * 這種行為在造成損失前先撞牆並留下告警。
   */
  SIGNING = "SIGNING",

  /**
   * Info: (20260812 - Luphia) 託管帳號索取 PRF 替身秘密（PR review P-4）。
   *
   * 刻意不與 SIGNING 共用:那個桶是為資金授權訂的尺寸（5/min、50/day）,
   * 而這支端點是**每次進聊天室都會走一次**的例行操作
   * （masterKeyRef 只活在 hook 的生命週期內,重新整理就重來）。
   *
   * 共用會有兩個後果:重載頁面五次就撞每分鐘上限而解鎖失敗;
   * 以及每日額度是共用的 —— 大量使用加密聊天會擠壓同一天的付款簽章額度,
   * 讓一個例行 UI 操作擋掉一個可用性關鍵的資金操作。
   *
   * 限流本身仍然必要:這支端點回傳的是可以解開對話內容的秘密,
   * 「偷到一枚 DeWT 就批次撈秘密」的成本不該是零。
   */
  PRF = "PRF",

  /**
   * Info: (20260818 - Luphia) 邀請連結的三支端點（PR #6652 第三輪 D）。
   *
   * token 是 256-bit CSPRNG、DB 只存 SHA-256，且失效／逾期／已接受一律回同一個
   * 404（無 oracle），所以暴力猜測本來就不可行——限流要防的不是猜 token。
   *
   * 防的是**未登入的 `decline` 沒有任何節流**：拿到一批轉寄出去的連結（或只是
   * 反覆打同一個），可以無成本地把邀請一封封拒掉，而被拒的邀請當場釋出席次、
   * 管理員只看到「對方拒絕了」。維度只能是 IP（這兩支端點刻意不要求登入，
   * 受邀者多半還沒有帳號）。
   *
   * 尺寸放寬：正常使用者在這頁的操作是「開連結、按一顆按鈕」，
   * 而誤限流會讓一個人加不進團隊——那是可用性事故。
   */
  INVITE_TOKEN = "INVITE_TOKEN",

  /**
   * Info: (20260818 - Luphia) 取不到來源 IP 時的共用桶（第四輪 B-4）。
   *
   * `resolveClientIp` 回 `"unknown"` 時所有流量落在同一個維度上。用
   * `INVITE_TOKEN` 的尺寸（20/分）等於「全站受邀者每分鐘合計 20 次」，
   * 第 21 位打開落地頁就是 429——而誤限流在這條路徑上就是可用性事故。
   *
   * 這個桶只擋失控流量的絕對上限，不假裝能區分使用者（那個狀態下確實區分不了）。
   * 仍然不 fail-open：無法識別呼叫者不等於不限流，只是限得鬆。
   */
  INVITE_TOKEN_UNIDENTIFIED = "INVITE_TOKEN_UNIDENTIFIED",

  /**
   * Info: (20260819 - Luphia) 邀請的**寄送端**（產品決定 20260819）。
   *
   * 免費版人數上限移除之後，寄信量沒有任何界線：免費團隊不收席次費，
   * 而每一封 email 邀請都是真的寄出去的信。人數不再是煞車，這裡就是。
   *
   * 維度是**操作者**（OWNER / ADMIN，這兩支端點要登入），不是 IP：
   * 同一間辦公室的兩位管理員不該互相排擠，而同一個人換 IP 也不該重新計數。
   *
   * 尺寸與團隊層的上限分工：這個桶擋「一個人短時間狂點」，
   * 團隊層的兩道上限（同時未接受數、每日寄送數）擋「整團的總量」。
   * 少了團隊層，多個管理員各自在額度內就能疊出大量寄信。
   */
  TEAM_INVITE_SEND = "TEAM_INVITE_SEND",

  /**
   * Info: (20260817 - Luphia) 打卡（time_attendance_module_plan §10.3 的護欄 G6）。
   *
   * 正常人一天打 2–4 次卡。上限壓低是為了讓腳本刷卡在造成資料污染前先撞牆並留下告警 ——
   * 而這裡的「資料污染」是**寫進法定文件的出勤事實**（勞基法 §30 要保存五年），
   * 不像聊天訊息可以刪掉重來。
   *
   * **失敗的嘗試也計入**：`enforceRateLimit` 排在圍欄判定之前，所以圍欄外被 403 的
   * 那些次數一樣算。若只對成功的打卡限流，「用不同座標反覆試到過關」這條路完全暢通。
   */
  ATTENDANCE_PUNCH = "ATTENDANCE_PUNCH",

  /**
   * Info: (20260825 - Julian) 小鈴鐺的讀取（摘要輪詢與展開清單）。
   *
   * **刻意不與 `READ` 共用。** 那個桶的尺寸是為「進頁面時取一次」訂的，
   * 而摘要端點是**每 60 秒被每個開著分頁的使用者打一次**的背景行為。
   * 共用等於把一個背景成本轉嫁到使用者的前景操作上：鈴鐺輪詢用掉額度，
   * 而使用者按下的那次讀取撞牆 —— 那是可用性事故，成因還很難猜。
   *
   * 同 `PRF` 當初必須與 `SIGNING` 分開的理由：不是成本量級不同，
   * 是**呼叫節奏的性質**不同。
   *
   * 尺寸要容得下多分頁：一個人開四個分頁 = 每分鐘 4 次，
   * 加上手動展開清單，30/min 有足夠餘裕而仍擋得住腳本。
   */
  NOTIFICATION_READ = "NOTIFICATION_READ",

  /**
   * Info: (20260825 - Julian) 小鈴鐺的寫入（標記已讀）。
   *
   * 尺寸可以緊：正常操作是「開鈴鐺、按一顆按鈕」。與讀取分桶是因為
   * 讀取的正常節奏比寫入高一個數量級，共用會讓寫入的上限失去意義。
   */
  NOTIFICATION_WRITE = "NOTIFICATION_WRITE",

  /**
   * Info: (20260817 - Luphia) 出勤的狀態變更（排班寫入、發起銷假徵詢、回應徵詢）。
   *
   * 不與 carbon 的 `SAVE` 共用：那個桶的尺寸是為報表 autosave（debounce 2s ≈ 30/min）
   * 訂的，而這三個動作都是人按一下的低頻操作。共用的後果是兩邊互相擠壓同一個預算，
   * 而它們的成本屬性毫無關係（同 `PRF` 不與 `SIGNING` 共用的理由）。
   *
   * 這些動作已各有權限閘，限流擋的是另一件事：**閘後的濫用**（有權限的人腳本化改班表）。
   */
  ATTENDANCE_WRITE = "ATTENDANCE_WRITE",

  /**
   * Info: (20260817 - Luphia) 緊急點名匯出。**這個桶的理由是 AuditLog 放大，不是 CPU。**
   *
   * 一次匯出對名單上的**每一個人**寫一筆 `AuditLogAction.READ`（500 人的帳本 = 500 列）。
   * 而 ADR 018 §6 把 `READ` 限定在 `EMPLOYEE_PII` 的理由正是「這張表會被沖爆，
   * 真正該被看見的個資存取反而被淹沒」—— 一支能被連打的放大器會親手造成那件事。
   *
   * 上限訂得夠寬鬆以支撐真實的疏散情境（事故現場會連續匯出好幾份，
   * 且「哪一份是最新的」不該用猜），但不足以當成輪詢端點用。
   */
  ATTENDANCE_EXPORT = "ATTENDANCE_EXPORT",

  /**
   * Info: (20260818 - Julian) 假勤的狀態變更（送出／撤回假單、核准、駁回、
   * 簽核規則改寫、額度調整、補授予）。
   *
   * **不與 `ATTENDANCE_WRITE` 共用，理由是每日額度會互相擠壓。** 那個桶的
   * 500/day 是為排班寫入訂的，而排班是唯一會被批次操作的動作（一位主管替
   * 一個工務段排下個月的班，一次就是數百格）。共用的後果是：主管排完班之後，
   * 同一個人當天送不出自己的假單 —— 兩件事的成本屬性無關，卻共享一個預算
   * （同 `PRF` 不與 `SIGNING` 共用的理由）。
   *
   * 讀取（額度、假單清單、明細、簽核規則）與試算沿用既有的 `READ`：
   * 試算雖然是 POST，但它不寫任何東西，且畫面上每改一次日期就會呼叫一次 ——
   * 掛在寫入桶會讓即時預覽在正常填單過程中就撞牆。
   */
  LEAVE_WRITE = "LEAVE_WRITE",

  /**
   * Info: (20260831 - Julian) 薪資計算機的寫入（員工名單 CRUD、儲存薪資紀錄）。
   *
   * **不與 `SAVE` 共用。** 那個桶的 60/min 是為碳排報告的 autosave debounce 訂的，
   * 而薪資的寫入是使用者按下按鈕才發生的離散動作 —— 兩件事的成本屬性無關，
   * 共用一個預算的後果是其中一邊的正常節奏會把另一邊擠掉
   * （同 `LEAVE_WRITE` 不與 `ATTENDANCE_WRITE` 共用的理由）。
   *
   * 讀取（員工清單、薪資紀錄清單與明細）沿用既有的 `READ`。
   */
  SALARY_WRITE = "SALARY_WRITE",
}

export interface IRateLimitWindow {
  windowMs: number;
  max: number;
}

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// Info: (20260716 - Emily) 初期閾值刻意放寬(誤限流 = 可用性事故),上線觀測一週 429 log 後再收緊
export const RATE_LIMIT_RULES: Record<RateLimitBucketEnum, IRateLimitWindow[]> =
  {
    [RateLimitBucketEnum.LLM]: [
      { windowMs: MINUTE_MS, max: envInt("CARBON_RL_LLM_PER_MINUTE", 12) },
      { windowMs: DAY_MS, max: envInt("CARBON_RL_LLM_PER_DAY", 500) },
    ],
    [RateLimitBucketEnum.UPLOAD]: [
      { windowMs: HOUR_MS, max: envInt("CARBON_RL_UPLOAD_PER_HOUR", 30) },
      { windowMs: DAY_MS, max: envInt("CARBON_RL_UPLOAD_PER_DAY", 120) },
    ],
    [RateLimitBucketEnum.READ]: [
      { windowMs: MINUTE_MS, max: envInt("CARBON_RL_READ_PER_MINUTE", 120) },
    ],
    [RateLimitBucketEnum.SAVE]: [
      { windowMs: MINUTE_MS, max: envInt("CARBON_RL_SAVE_PER_MINUTE", 60) },
    ],
    [RateLimitBucketEnum.FAITH_GUEST]: [
      { windowMs: MINUTE_MS, max: envInt("FAITH_RL_GUEST_PER_MINUTE", 2) },
      { windowMs: DAY_MS, max: envInt("FAITH_RL_GUEST_PER_DAY", 5) },
    ],
    [RateLimitBucketEnum.SIGNING]: [
      { windowMs: MINUTE_MS, max: envInt("SIGNING_RL_PER_MINUTE", 5) },
      { windowMs: DAY_MS, max: envInt("SIGNING_RL_PER_DAY", 50) },
    ],
    [RateLimitBucketEnum.INVITE_TOKEN]: [
      { windowMs: MINUTE_MS, max: envInt("INVITE_RL_PER_MINUTE", 20) },
      { windowMs: DAY_MS, max: envInt("INVITE_RL_PER_DAY", 200) },
    ],
    [RateLimitBucketEnum.TEAM_INVITE_SEND]: [
      { windowMs: MINUTE_MS, max: envInt("INVITE_SEND_RL_PER_MINUTE", 10) },
      { windowMs: DAY_MS, max: envInt("INVITE_SEND_RL_PER_DAY", 100) },
    ],
    [RateLimitBucketEnum.INVITE_TOKEN_UNIDENTIFIED]: [
      {
        windowMs: MINUTE_MS,
        max: envInt("INVITE_RL_UNIDENTIFIED_PER_MINUTE", 300),
      },
      {
        windowMs: DAY_MS,
        max: envInt("INVITE_RL_UNIDENTIFIED_PER_DAY", 5_000),
      },
    ],
    [RateLimitBucketEnum.PRF]: [
      { windowMs: MINUTE_MS, max: envInt("PRF_RL_PER_MINUTE", 20) },
      { windowMs: DAY_MS, max: envInt("PRF_RL_PER_DAY", 200) },
    ],
    // Info: (20260817 - Luphia) 數值取自 time_attendance_module_plan §10.3，不是重新發明的
    [RateLimitBucketEnum.ATTENDANCE_PUNCH]: [
      {
        windowMs: MINUTE_MS,
        max: envInt("ATTENDANCE_RL_PUNCH_PER_MINUTE", 5),
      },
      { windowMs: DAY_MS, max: envInt("ATTENDANCE_RL_PUNCH_PER_DAY", 40) },
    ],
    [RateLimitBucketEnum.ATTENDANCE_WRITE]: [
      {
        windowMs: MINUTE_MS,
        max: envInt("ATTENDANCE_RL_WRITE_PER_MINUTE", 30),
      },
      { windowMs: DAY_MS, max: envInt("ATTENDANCE_RL_WRITE_PER_DAY", 500) },
    ],
    /**
     * Info: (20260818 - Julian) 尺寸沿用 `ATTENDANCE_WRITE`（都是人按一下的低頻動作），
     * 但**額度是分開的** —— 見 enum 上的說明。
     */
    [RateLimitBucketEnum.LEAVE_WRITE]: [
      { windowMs: MINUTE_MS, max: envInt("LEAVE_RL_WRITE_PER_MINUTE", 30) },
      { windowMs: DAY_MS, max: envInt("LEAVE_RL_WRITE_PER_DAY", 500) },
    ],
    [RateLimitBucketEnum.SALARY_WRITE]: [
      { windowMs: MINUTE_MS, max: envInt("SALARY_RL_WRITE_PER_MINUTE", 30) },
      { windowMs: DAY_MS, max: envInt("SALARY_RL_WRITE_PER_DAY", 300) },
    ],
    [RateLimitBucketEnum.ATTENDANCE_EXPORT]: [
      {
        windowMs: MINUTE_MS,
        max: envInt("ATTENDANCE_RL_EXPORT_PER_MINUTE", 6),
      },
      { windowMs: DAY_MS, max: envInt("ATTENDANCE_RL_EXPORT_PER_DAY", 60) },
    ],
    /**
     * Info: (20260825 - Julian) 每日窗算得出來：60 秒輪詢 × 24 小時 = 1440 次，
     * 四個分頁就是 5760 次。8000 容得下多分頁加上手動展開，
     * 而它擋得住「拿到 DeWT 後整天全速打」。
     */
    [RateLimitBucketEnum.NOTIFICATION_READ]: [
      {
        windowMs: MINUTE_MS,
        max: envInt("NOTIFICATION_RL_READ_PER_MINUTE", 30),
      },
      { windowMs: DAY_MS, max: envInt("NOTIFICATION_RL_READ_PER_DAY", 8_000) },
    ],
    [RateLimitBucketEnum.NOTIFICATION_WRITE]: [
      {
        windowMs: MINUTE_MS,
        max: envInt("NOTIFICATION_RL_WRITE_PER_MINUTE", 20),
      },
      { windowMs: DAY_MS, max: envInt("NOTIFICATION_RL_WRITE_PER_DAY", 500) },
    ],
  };

// Info: (20260716 - Emily) 記憶體防護:追蹤 key 數上限與清掃節奏(lazy sweep,無常駐 timer)
export const RATE_LIMIT_MAX_TRACKED_KEYS = 50_000;
export const RATE_LIMIT_SWEEP_EVERY_N_CHECKS = 1_000;

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
  };

// Info: (20260716 - Emily) 記憶體防護:追蹤 key 數上限與清掃節奏(lazy sweep,無常駐 timer)
export const RATE_LIMIT_MAX_TRACKED_KEYS = 50_000;
export const RATE_LIMIT_SWEEP_EVERY_N_CHECKS = 1_000;

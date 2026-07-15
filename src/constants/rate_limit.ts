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
  };

// Info: (20260716 - Emily) 記憶體防護:追蹤 key 數上限與清掃節奏(lazy sweep,無常駐 timer)
export const RATE_LIMIT_MAX_TRACKED_KEYS = 50_000;
export const RATE_LIMIT_SWEEP_EVERY_N_CHECKS = 1_000;

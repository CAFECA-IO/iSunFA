import {
  DEFAULT_FAITH_MEMORY_RETENTION_DAYS,
  FAITH_MEMORY_RETENTION_DAYS_MAX,
  FAITH_MEMORY_RETENTION_DAYS_MIN,
} from "@/constants/llm";

/**
 * Info: (20260812 - Luphia) 費思記憶保留期的純函式層（規範 §7）。
 * 不碰 DB、不碰時鐘：設定值的字串解析與到期日推算都是決定論數學，可單測。
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Info: (20260812 - Luphia) 解析系統設定的保留天數。
 *
 * 設定值來自 DB（可由後台編輯的自由文字），屬外部不可預知資料：非正整數、
 * 超出合法區間、含小數或前後綴一律**回退預設值**，而不是就地取整或截斷。
 * 這裡的 fail-safe 方向刻意選「回退到承諾值 90」而非「回退到不刪除」——
 * 設定打錯的後果不該是條款承諾要刪的資料永久留著。
 */
export function parseRetentionDays(raw: string | undefined | null): number {
  if (typeof raw !== "string") return DEFAULT_FAITH_MEMORY_RETENTION_DAYS;
  const trimmed = raw.trim();
  // Info: (20260812 - Luphia) 只接受純十進位整數字串；Number() 會放行 "9e2"、" 90 "、"0x5A"
  if (!/^\d+$/.test(trimmed)) return DEFAULT_FAITH_MEMORY_RETENTION_DAYS;
  const days = Number(trimmed);
  if (
    !Number.isSafeInteger(days) ||
    days < FAITH_MEMORY_RETENTION_DAYS_MIN ||
    days > FAITH_MEMORY_RETENTION_DAYS_MAX
  ) {
    return DEFAULT_FAITH_MEMORY_RETENTION_DAYS;
  }
  return days;
}

/**
 * Info: (20260812 - Luphia) 訂閱終止日 + 保留天數 = 記憶到期時點（規範 §7.1）。
 * 期限「算好存進 FaithMemory.expiresAt」而非每次推導：推導點一多，
 * 條款承諾的那個日期就會出現兩種算法。
 */
export function resolveMemoryExpiresAt(
  subscriptionEndedAtMs: number,
  retentionDays: number,
): Date {
  return new Date(subscriptionEndedAtMs + retentionDays * MS_PER_DAY);
}

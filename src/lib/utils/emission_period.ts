// Info: (20260806 - Tzuhan) 排放期間:交易時間戳 → 月別標籤(`YYYY-MM`)。決定性純函式。

import {
  EMISSION_MONTH_LABEL_DIGITS,
  EMISSION_TIMESTAMP_MAX_SECONDS,
  EMISSION_TIMESTAMP_MIN_SECONDS,
  MILLISECONDS_PER_SECOND,
} from "@/constants/emission_period";

/**
 * Info: (20260806 - Tzuhan) 交易時間戳(秒)→ 月別標籤 `YYYY-MM`;無法判定即回 `null`。
 *
 * ## 為什麼用 UTC 曆日,而不是瀏覽器所在時區
 *
 * `EsgRecord.tradingDate` 是 `DateTime`,**schema 上沒有任何逐筆的時區資訊**。
 * 寫入端絕大多數是憑證上抓到的日期字串(`new Date("2025-02-01")` = UTC 午夜),
 * 那種值在 UTC 下讀出來的月份就是憑證上的月份;
 * 但退路 `new Date(Date.now())` 會帶真實時刻,於是月初/月末各有一段
 * 八小時的窗口,UTC 與台北會落在不同月份。
 *
 * 兩害相權取 UTC,理由是**決定性**:
 * 若改用瀏覽器時區,同一份 ledger 在台北與倫敦的查核者手上會產出不同的月別數字,
 * 而這是一份要拿去對帳的審計文件 —— 同資料同結果比「對某一個人來說更直覺」重要。
 * 界線本身寫成測試釘住(見 emission_period.test.ts),它是選擇而不是意外。
 *
 * ## 為什麼不猜
 *
 * 沒有時間戳、時間戳不是整數、或落在合理範圍外(最常見是誤把毫秒當秒)一律回 `null`,
 * 由呼叫端顯示為「未標註期間」。猜一個月份等於在查核文件上寫一個沒有依據的事實。
 */
export function resolveEmissionMonth(
  tradingTimestamp: number | undefined,
): string | null {
  if (tradingTimestamp === undefined) return null;
  // Info: (20260806 - Tzuhan) isInteger 同時擋掉 NaN / Infinity / 小數
  if (!Number.isInteger(tradingTimestamp)) return null;
  if (tradingTimestamp < EMISSION_TIMESTAMP_MIN_SECONDS) return null;
  if (tradingTimestamp > EMISSION_TIMESTAMP_MAX_SECONDS) return null;

  const date = new Date(tradingTimestamp * MILLISECONDS_PER_SECOND);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(EMISSION_MONTH_LABEL_DIGITS, "0")}`;
}

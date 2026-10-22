import {
  BUSINESS_MONITOR_MAX_SCOPE_YEARS,
  BUSINESS_MONITOR_TAI_VARIANTS,
  BUSINESS_MONITOR_YEAR_PATTERN,
} from "@/constants/business_monitor";

/**
 * Info: (20261022 - Luphia) 企業觀測站的範疇與搜尋字詞處理。純函數，前後端共用。
 */

// Info: (20261022 - Luphia) 問題裡出現的西元年（去重、保留出現順序、最多 5 個）
export function detectYears(text: string): string[] {
  const matches = text.match(BUSINESS_MONITOR_YEAR_PATTERN) ?? [];
  return Array.from(new Set(matches)).slice(
    0,
    BUSINESS_MONITOR_MAX_SCOPE_YEARS,
  );
}

// Info: (20261022 - Luphia) 「台泥」與「臺泥」都要找得到：產生互換異體字後的所有寫法
export function taiVariantsOf(keyword: string): string[] {
  const [tai, taiFormal] = BUSINESS_MONITOR_TAI_VARIANTS;
  return Array.from(
    new Set([
      keyword,
      keyword.split(tai).join(taiFormal),
      keyword.split(taiFormal).join(tai),
    ]),
  );
}

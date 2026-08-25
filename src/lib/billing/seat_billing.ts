import { MoneyUtil } from "@/lib/utils/money";

/**
 * Info: (20260814 - Luphia) 席次計費的純數學（規範 `team_seat_billing_and_email_invitation.md` P2–P3）。
 *
 * 兩件事必須是決定論且可單測：訂閱總額（席次 × 單價）與期中加人的比例補收。
 * 補收金額算錯不會噴錯，只會多收或少收——不寫測試就不會有人發現。
 * 不碰 DB、不碰時鐘（時間由呼叫端注入），與額度視窗數學同一套原則。
 */

// Info: (20260814 - Luphia) 至少一席：團隊再小也有擁有者本人
export const MIN_SEATS = 1;

export function resolveSubscriptionAmount(
  unitPrice: number,
  seats: number,
): number {
  const effectiveSeats = Math.max(MIN_SEATS, Math.floor(seats));
  return MoneyUtil.toDecimal(unitPrice)
    .times(effectiveSeats)
    .round()
    .toNumber();
}

export interface ISeatProrationParams {
  // Info: (20260814 - Luphia) 本期單價快照（TWD 整數，單一席次）
  unitPrice: number;
  nowMs: number;
  periodStartMs: number;
  periodEndMs: number;
  /**
   * Info: (20260821 - Luphia) **一個計費週期**的天數（月繳 30／年繳 365，
   * 見 `BILLING_INTERVAL_DAYS`）。這是比例的分母——不能用
   * `periodEnd − periodStart`：展延之後那個跨距可能是好幾期
   * （提早續購把新期疊在舊期末之後），用跨距當分母會把補收金額除以期數
   * （review #6687 二輪高-1：疊兩期就只收一半）。
   */
  periodDays: number;
  // Info: (20260814 - Luphia) 一次加入的席次數（預設 1）
  seats?: number;
}

/**
 * Info: (20260814 - Luphia) 期中加人的比例補收：`單價 × 剩餘時間 / 一期時間 × 席次`。
 *
 * 採**無條件捨去**：邊界上的零頭算給用戶，而不是算給自己。
 * 因此期末最後幾小時加人可能算出 0 元——那是刻意的，呼叫端遇到 0 就不建單，
 * 免得產生一張 0 元訂單去打金流（金流會拒絕，而那筆失敗毫無意義）。
 *
 * Info: (20260821 - Luphia) 剩餘超過一期時**照實收超過一期的錢**（不再截到一期）：
 * 展延過的訂閱剩餘就是可能大於一期，而那一席在整段剩餘期間都占位。
 * 展延閘門（剩餘 30 天內才能續購）保證跨距不超過「一期 + 30 天」，
 * 因此這裡的倍數天然有界（月繳 < 2 期、年繳 < 1.1 期）。
 *
 * 期間資料異常（結束早於開始、now 落在期外、週期天數非正）一律回 0：
 * 寧可少收一次，也不要因為髒資料對用戶的卡扣一筆算不出根據的錢。
 */
export function resolveSeatProration(params: ISeatProrationParams): number {
  const {
    unitPrice,
    nowMs,
    periodStartMs,
    periodEndMs,
    periodDays,
    seats = 1,
  } = params;
  const effectiveSeats = Math.max(0, Math.floor(seats));
  if (effectiveSeats === 0 || unitPrice <= 0) return 0;
  if (periodDays <= 0) return 0;

  const spanMs = periodEndMs - periodStartMs;
  if (spanMs <= 0) return 0;

  const remainingMs = periodEndMs - nowMs;
  if (remainingMs <= 0) return 0;
  // Info: (20260814 - Luphia) now 早於期初（時鐘偏移 / 髒資料）：以跨距計，不放大也不倒扣
  const billableMs = remainingMs > spanMs ? spanMs : remainingMs;
  const intervalMs = periodDays * 86_400_000;

  return MoneyUtil.toDecimal(unitPrice)
    .times(effectiveSeats)
    .times(billableMs)
    .dividedBy(intervalMs)
    .floor()
    .toNumber();
}

/**
 * Info: (20260820 - Julian) 畫面上的量要往**對使用者安全的方向**取整
 * （review 第 7 輪 M28）。
 *
 * ## 被修掉的東西
 *
 * 餘額卡與加班統計卡先前一律 `(minutes / perUnit).toFixed(1)`，而 `toFixed`
 * 是**四捨五入**：
 *
 * ```
 * 特休還剩 449 分、一日 450 分  → 0.9977…  → toFixed(1) = "1.0 天"
 * 本月上限還剩 57 分鐘          → 0.95     → toFixed(1) = "1.0 小時"
 * ```
 *
 * 兩個人都會照著畫面去請，然後拿到 `VA_LEAVE_INSUFFICIENT_BALANCE`
 * 或被上限擋下。而這兩張卡片存在的唯一理由，它們自己的檔頭寫著：
 * 「不然他只會收到一個被拒絕的結果，而不知道為什麼」——
 * 一個把 449 顯示成 1.0 的卡片，製造的正是那個結果。
 *
 * ## 判準：問題的方向決定取整的方向
 *
 * | 這個數字回答的問題 | 方向 | 為什麼 |
 * |---|---|---|
 * | 「我還可以用多少」（餘額、剩餘額度） | **無條件捨去** | 顯示得比實際多，使用者會撞牆 |
 * | 「我已經用掉多少」（已認列、已請） | **無條件進位** | 顯示得比實際少，使用者會以為還有空間 |
 * | 「上限是多少」 | 無條件捨去 | 同上：把天花板講高會讓人以為還能加 |
 *
 * 兩個方向都存在，是因為「安全」不是一個固定的方向 —— 它取決於使用者
 * 讀到這個數字之後會做什麼。
 *
 * ## 為什麼是整數運算而不是 `Math.floor(x * 10) / 10`
 *
 * 後者會踩到與 `Math.floor(headcount * Number(ratio))` 同一個坑
 * （review 第 5 輪 M1）：`0.7 * 10` 是 6.999999999999999。
 * 這裡全程 BigInt，除法只做一次，沒有任何中間浮點值。
 *
 * **不可用於金額**：這是顯示層的取整，不是會計運算。
 */

const TEN = 10n;

/** Info: (20260820 - Julian) 顯示層的分母。本模組的量一律以分鐘保存（ADR 022 §2） */
export const MINUTES_PER_HOUR = 60;

const formatScaled = (scaled: bigint, scale: number): string => {
  const negative = scaled < 0n;
  const digits = (negative ? -scaled : scaled).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const fraction = scale === 0 ? "" : `.${digits.slice(digits.length - scale)}`;
  return `${negative ? "-" : ""}${whole}${fraction}`;
};

/**
 * Info: (20260820 - Julian) `floor(numerator / denominator)`，取到 `scale` 位小數。
 * 分母為 0 或非有限值時回 null —— 呼叫端要自己決定顯示什麼（通常是「—」），
 * 而回 "0.0" 會讓「算不出來」與「真的是零」變成同一件事。
 */
export const floorRatioText = (
  numerator: number,
  denominator: number,
  scale = 1,
): string | null => {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return null;
  if (denominator <= 0) return null;

  const factor = TEN ** BigInt(scale);
  const num = BigInt(numerator) * factor;
  const den = BigInt(denominator);

  /**
   * Info: (20260820 - Julian) BigInt 的 `/` 是**朝零**截斷，不是 floor。
   * 負數（超出上限的剩餘量）在這裡差一個單位，而那正是要顯示成
   * 「已經超過」的那一側 —— 不修的話 -0.05 會變成 "0.0"，
   * 讀起來像「剛好用完」。
   */
  const quotient = num / den;
  const floored = num % den !== 0n && num < 0n ? quotient - 1n : quotient;
  return formatScaled(floored, scale);
};

/** Info: (20260820 - Julian) `ceil(numerator / denominator)`，取到 `scale` 位小數 */
export const ceilRatioText = (
  numerator: number,
  denominator: number,
  scale = 1,
): string | null => {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return null;
  if (denominator <= 0) return null;

  const factor = TEN ** BigInt(scale);
  const num = BigInt(numerator) * factor;
  const den = BigInt(denominator);

  const quotient = num / den;
  const ceiled = num % den !== 0n && num > 0n ? quotient + 1n : quotient;
  return formatScaled(ceiled, scale);
};

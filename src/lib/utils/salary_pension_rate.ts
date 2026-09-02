/**
 * Info: (20260902 - Julian) 自提勞退費率的兩種表示法之間的轉換。
 *
 * ## 為什麼需要這一對函式
 *
 * 計算機的 UI 用**小數費率**：`others_form.tsx` 的七顆單選鈕是
 * `Array.from({ length: 7 }, (_, i) => i * 0.01)` —— 0、0.01 … 0.06。
 * 資料庫存的是**百分點整數**（0–6）。
 *
 * 這個轉換看起來只是乘除 100，值得一支檔案是因為它**很容易被寫成別的東西**：
 * 引擎那一側的欄位叫 `employeeBurdenPensionInsurance`（「個人自願提繳退休金」），
 * 名字讀起來像金額，而它旁邊那 12 個常態欄位裡有 4 個真的是 `BigInt` 金額。
 * 照抄的後果：
 *
 * - `BigInt(0.06)` → 直接丟 `RangeError`（至少會炸，還算好的）
 * - `BigInt(Math.round(0.06))` → 靜靜變成 **0**。使用者選了 6%，
 *   存進去是 0、載回來是 0，而單選鈕顯示「0%」看起來像他自己沒選
 *
 * 也不用 `Float` 存：0.06 沒有精確的二進位表示，而這個值會參與金額計算
 * （precision guideline §1 的同一條理由）。整數百分點沒有這個問題。
 *
 * ## 為什麼要 clamp 而不是 fail fast
 *
 * 寫入路徑有 zod（`z.number().int().min(0).max(6)`）擋著，那裡是 fail fast。
 * 這一對是**讀取**路徑用的：資料庫裡萬一有超出值域的舊值，
 * 讓它落在最近的合法檔位，比讓計算機的單選鈕一顆都不選中好
 * —— 後者會讓表單變成非受控元件，而且畫面上看不出原因。
 */

export const MIN_PENSION_RATE_PERCENT = 0;
export const MAX_PENSION_RATE_PERCENT = 6;

/**
 * Info: (20260902 - Julian) 0.06（UI 費率）→ 6（落地百分點）。
 *
 * 用 `Math.round` 不是 `Math.trunc`：`0.03 * 100` 在 IEEE 754 下是
 * 3.0000000000000004，`trunc` 會得到 3 沒錯，但 `0.29 * 100 = 28.999999999999996`
 * 這一類的值域一旦擴充就會靜靜少一個百分點。
 */
export const toPensionRatePercent = (rate: number): number => {
  const percent = Math.round(rate * 100);

  if (!Number.isFinite(percent)) return MIN_PENSION_RATE_PERCENT;

  return Math.min(
    Math.max(percent, MIN_PENSION_RATE_PERCENT),
    MAX_PENSION_RATE_PERCENT,
  );
};

// Info: (20260902 - Julian) 6（落地百分點）→ 0.06（UI 費率）。反函式
export const fromPensionRatePercent = (percent: number): number => {
  if (!Number.isFinite(percent)) return 0;

  const clamped = Math.min(
    Math.max(Math.round(percent), MIN_PENSION_RATE_PERCENT),
    MAX_PENSION_RATE_PERCENT,
  );

  return clamped / 100;
};

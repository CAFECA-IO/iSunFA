import { Decimal } from "decimal.js";

// Info: (20260512 - Tzuhan) 前端防腐層 (Anti-Corruption Layer)
// 封裝所有與金額相關的極端大數與浮點數運算，避免在 React 元件中直接操作 Decimal。

export type MoneyValue = string | number | bigint | Decimal;

export const MoneyUtil = {
  /**
   * 將任意金額轉為 Decimal 物件，統一進位或小數點基準
   */
  toDecimal(val: MoneyValue): Decimal {
    try {
      return new Decimal(val.toString());
    } catch {
      return new Decimal(0);
    }
  },

  /**
   * 格式化金額，加入千分位與自訂小數點位數
   * 如果是負數，會回傳帶有括號的會計格式：(1,000)
   */
  format(val: MoneyValue, fractionDigits: number = 0): string {
    const dec = this.toDecimal(val);
    const isNegative = dec.isNegative();
    const absValStr = dec.abs().toFixed(fractionDigits);

    // 加上千分位
    const parts = absValStr.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formatted = parts.join(".");

    return isNegative ? `(${formatted})` : formatted;
  },

  /**
   * 安全加總
   */
  add(a: MoneyValue, b: MoneyValue): string {
    return this.toDecimal(a).plus(this.toDecimal(b)).toString();
  },

  /**
   * 安全相減 (a - b)
   */
  subtract(a: MoneyValue, b: MoneyValue): string {
    return this.toDecimal(a).minus(this.toDecimal(b)).toString();
  },

  /**
   * 取絕對值
   */
  abs(val: MoneyValue): string {
    return this.toDecimal(val).abs().toString();
  },

  /**
   * 檢查是否小於零
   */
  isNegative(val: MoneyValue): boolean {
    return this.toDecimal(val).isNegative();
  },

  /**
   * 計算總和
   */
  sum(values: MoneyValue[]): string {
    return values
      .reduce<Decimal>(
        (acc, curr) => acc.plus(this.toDecimal(curr)),
        new Decimal(0),
      )
      .toString();
  },

  /**
   * 安全計算比率 (numerator / denominator * 100)，避免除以零。
   * 回傳數值 (number)
   */
  safeRatio(numerator: MoneyValue, denominator: MoneyValue): number {
    const denom = this.toDecimal(denominator);
    if (denom.isZero()) return 0;
    return this.toDecimal(numerator).dividedBy(denom).times(100).toNumber();
  },
};

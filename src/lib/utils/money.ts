import { Decimal } from "decimal.js";

// Info: (20260512 - Tzuhan) 前端防腐層 (Anti-Corruption Layer)
// Info: (20260512 - Tzuhan) 封裝所有與金額相關的極端大數與浮點數運算，避免在 React 元件中直接操作 Decimal。

export type MoneyValue = string | number | bigint | Decimal;

export const MoneyUtil = {
  /**
   * Info: (20260512 - Tzuhan)
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
   * Info: (20260513 - Tzuhan)
   * 企業級輸入反格式化：將 (1,000) 解析為 -1000，並提供嚴格校驗
   */
  parseInput(val: string): string {
    if (!val) return "0";
    let parsed = val.trim();

    // Info: (20260513 - Tzuhan) 處理括號表示的負數 (xxx)
    const isNegativeBracket = parsed.startsWith("(") && parsed.endsWith(")");
    if (isNegativeBracket) {
      parsed = "-" + parsed.substring(1, parsed.length - 1);
    }

    // Info: (20260513 - Tzuhan) 移除所有的千分位逗號
    parsed = parsed.replace(/,/g, "");

    try {
      const dec = new Decimal(parsed);
      if (dec.isNaN()) {
        throw new Error("Parsed value is NaN");
      }
      return dec.toString();
    } catch (e) {
      // Info: (20260513 - Tzuhan) 企業級系統不可靜默吞沒錯誤，先印出 Log 供除錯，然後拋出例外交由表單層處理
      console.error("[MoneyUtil] Parse error:", e);
      throw new Error(`[MoneyUtil] Invalid financial input format: "${val}"`);
    }
  },

  /**
   * Info: (20260512 - Tzuhan)
   * 格式化金額，加入千分位與自訂小數點位數
   * 如果是負數，會回傳帶有括號的會計格式：(1,000)
   */
  format(val: MoneyValue, fractionDigits: number = 0): string {
    const dec = this.toDecimal(val);
    const isNegative = dec.isNegative();
    const absValStr = dec.abs().toFixed(fractionDigits);

    // Info: (20260512 - Tzuhan) 加上千分位
    const parts = absValStr.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formatted = parts.join(".");

    return isNegative ? `(${formatted})` : formatted;
  },

  /**
   * Info: (20260512 - Tzuhan) 安全加總
   */
  add(a: MoneyValue, b: MoneyValue): string {
    return this.toDecimal(a).plus(this.toDecimal(b)).toString();
  },

  /**
   * Info: (20260512 - Tzuhan) 安全相減 (a - b)
   */
  subtract(a: MoneyValue, b: MoneyValue): string {
    return this.toDecimal(a).minus(this.toDecimal(b)).toString();
  },

  /**
   * Info: (20260512 - Tzuhan) 取絕對值
   */
  abs(val: MoneyValue): string {
    return this.toDecimal(val).abs().toString();
  },

  /**
   * Info: (20260512 - Tzuhan) 檢查是否小於零
   */
  isNegative(val: MoneyValue): boolean {
    return this.toDecimal(val).isNegative();
  },

  /**
   * Info: (20260512 - Tzuhan) 計算總和
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
   * Info: (20260512 - Tzuhan)
   * 安全計算比率 (numerator / denominator * 100)，避免除以零。
   * 回傳數值 (number)
   */
  safeRatio(numerator: MoneyValue, denominator: MoneyValue): number {
    const denom = this.toDecimal(denominator);
    if (denom.isZero()) return 0;
    return this.toDecimal(numerator).dividedBy(denom).times(100).toNumber();
  },
};

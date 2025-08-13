import Decimal from 'decimal.js';
/**
 * Info: (20250813 - Shirley)
 * DecimalOperations - Utility class for precise decimal arithmetic operations
 * Replaces JavaScript's native number operations to prevent floating-point precision issues
 * Can be used in both frontend and backend environments
 */
export class DecimalOperations {
  private static readonly DEFAULT_PRECISION = 20;

  private static readonly DEFAULT_DECIMAL_PLACES = 10;

  /**
   * Info: (20250813 - Shirley)
   * Configure Decimal.js with accounting-appropriate settings
   */
  static {
    Decimal.config({
      precision: DecimalOperations.DEFAULT_PRECISION,
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -7,
      toExpPos: 21,
      minE: -324,
      maxE: 308,
    });
  }

  /**
   * Info: (20250813 - Shirley)
   * Add two decimal values
   */
  static add(a: string | number, b: string | number): string {
    const decimalA = new Decimal(String(a).trim());
    const decimalB = new Decimal(String(b).trim());
    return decimalA.plus(decimalB).toFixed();
  }

  /**
   * Info: (20250813 - Shirley)
   * Subtract two decimal values (a - b)
   */
  static subtract(a: string | number, b: string | number): string {
    const decimalA = new Decimal(String(a).trim());
    const decimalB = new Decimal(String(b).trim());
    return decimalA.minus(decimalB).toFixed();
  }

  /**
   * Info: (20250813 - Shirley)
   * Multiply two decimal values
   */
  static multiply(a: string | number, b: string | number): string {
    const decimalA = new Decimal(String(a).trim());
    const decimalB = new Decimal(String(b).trim());
    return decimalA.times(decimalB).toFixed();
  }

  /**
   * Info: (20250813 - Shirley)
   * Divide two decimal values (a / b)
   */
  static divide(a: string | number, b: string | number): string {
    const decimalA = new Decimal(String(a).trim());
    const decimalB = new Decimal(String(b).trim());
    if (decimalB.isZero()) {
      throw new Error('Division by zero is not allowed');
    }
    return decimalA.dividedBy(decimalB).toFixed();
  }

  /**
   * Info: (20250813 - Shirley)
   * Get absolute value of decimal
   */
  static abs(value: string | number): string {
    const decimal = new Decimal(String(value).trim());
    return decimal.abs().toFixed();
  }

  /**
   * Info: (20250813 - Shirley)
   * Negate decimal value
   */
  static negate(value: string | number): string {
    const decimal = new Decimal(String(value).trim());
    return decimal.negated().toFixed();
  }

  // Comparison Operations

  /**
   * Info: (20250813 - Shirley)
   * Check if two decimal values are equal
   */
  static isEqual(a: string | number, b: string | number): boolean {
    const decimalA = new Decimal(String(a).trim());
    const decimalB = new Decimal(String(b).trim());
    return decimalA.equals(decimalB);
  }

  /**
   * Info: (20250813 - Shirley)
   * Check if first value is greater than second
   */
  static isGreaterThan(a: string | number, b: string | number): boolean {
    const decimalA = new Decimal(String(a).trim());
    const decimalB = new Decimal(String(b).trim());
    return decimalA.greaterThan(decimalB);
  }

  /**
   * Info: (20250813 - Shirley)
   * Check if first value is greater than or equal to second
   */
  static isGreaterThanOrEqual(a: string | number, b: string | number): boolean {
    const decimalA = new Decimal(String(a).trim());
    const decimalB = new Decimal(String(b).trim());
    return decimalA.greaterThanOrEqualTo(decimalB);
  }

  /**
   * Info: (20250813 - Shirley)
   * Check if first value is less than second
   */
  static isLessThan(a: string | number, b: string | number): boolean {
    const decimalA = new Decimal(String(a).trim());
    const decimalB = new Decimal(String(b).trim());
    return decimalA.lessThan(decimalB);
  }

  /**
   * Info: (20250813 - Shirley)
   * Check if first value is less than or equal to second
   */
  static isLessThanOrEqual(a: string | number, b: string | number): boolean {
    const decimalA = new Decimal(String(a).trim());
    const decimalB = new Decimal(String(b).trim());
    return decimalA.lessThanOrEqualTo(decimalB);
  }

  /**
   * Info: (20250813 - Shirley)
   * Check if decimal value is zero
   */
  static isZero(value: string | number): boolean {
    const decimal = new Decimal(String(value).trim());
    return decimal.isZero();
  }

  /**
   * Info: (20250813 - Shirley)
   * Check if decimal value is positive
   */
  static isPositive(value: string | number): boolean {
    const decimal = new Decimal(String(value).trim());
    return decimal.greaterThan(0);
  }

  /**
   * Info: (20250813 - Shirley)
   * Check if decimal value is negative
   */
  static isNegative(value: string | number): boolean {
    const decimal = new Decimal(String(value).trim());
    return decimal.lessThan(0);
  }

  // Info: (20250813 - Shirley) Array Operations ------

  /**
   * Info: (20250813 - Shirley)
   * Sum an array of decimal values
   */
  static sum(values: (string | number)[]): string {
    if (values.length === 0) return '0';

    let result = new Decimal(0);
    // eslint-disable-next-line no-restricted-syntax
    for (const value of values) {
      result = result.plus(new Decimal(String(value).trim()));
    }
    return result.toFixed();
  }

  /**
   * Info: (20250813 - Shirley)
   * Find minimum value in array
   */
  static min(values: (string | number)[]): string {
    if (values.length === 0) {
      throw new Error('Cannot find minimum of empty array');
    }

    let min = new Decimal(String(values[0]).trim());
    for (let i = 1; i < values.length; i += 1) {
      const current = new Decimal(String(values[i]).trim());
      if (current.lessThan(min)) {
        min = current;
      }
    }
    return min.toFixed();
  }

  /**
   * Info: (20250813 - Shirley)
   * Find maximum value in array
   */
  static max(values: (string | number)[]): string {
    if (values.length === 0) {
      throw new Error('Cannot find maximum of empty array');
    }

    let max = new Decimal(String(values[0]).trim());
    for (let i = 1; i < values.length; i += 1) {
      const current = new Decimal(String(values[i]).trim());
      if (current.greaterThan(max)) {
        max = current;
      }
    }
    return max.toFixed();
  }

  /**
   * Info: (20250813 - Shirley)
   * Calculate average of array values
   */
  static average(values: (string | number)[]): string {
    if (values.length === 0) {
      throw new Error('Cannot calculate average of empty array');
    }

    const total = DecimalOperations.sum(values);
    return DecimalOperations.divide(total, values.length);
  }

  // Info: (20250813 - Shirley) Utility Methods ------

  /**
   * Info: (20250813 - Shirley)
   * Round decimal to specified decimal places
   */
  static round(value: string | number, decimalPlaces: number = 2): string {
    const decimal = new Decimal(String(value).trim());
    return decimal.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toFixed(decimalPlaces);
  }

  /**
   * Info: (20250813 - Shirley)
   * Format decimal with thousand separators
   */
  static format(value: string | number, decimalPlaces?: number): string {
    const decimal = new Decimal(String(value).trim());
    const fixed =
      decimalPlaces !== undefined
        ? decimal.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toFixed(decimalPlaces)
        : decimal.toFixed();

    return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Info: (20250813 - Shirley)
   * Validate if string is a valid decimal number
   */
  static isValidDecimal(value: string): boolean {
    try {
      // eslint-disable-next-line no-new
      new Decimal(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Info: (20250813 - Shirley)
   * Convert to string with exact precision (no trailing zeros)
   */
  static toExactString(value: string | number): string {
    const decimal = new Decimal(String(value).trim());
    return decimal.toString();
  }

  /**
   * Info: (20250813 - Shirley)
   * Check if debit/credit balance (for accounting validation)
   */
  static isBalanced(debits: (string | number)[], credits: (string | number)[]): boolean {
    const totalDebits = DecimalOperations.sum(debits);
    const totalCredits = DecimalOperations.sum(credits);
    return DecimalOperations.isEqual(totalDebits, totalCredits);
  }
}

// Info: (20250813 - Shirley) Export individual functions for convenience
export const {
  add,
  subtract,
  multiply,
  divide,
  abs,
  negate,
  isEqual,
  isGreaterThan,
  isGreaterThanOrEqual,
  isLessThan,
  isLessThanOrEqual,
  isZero,
  isPositive,
  isNegative,
  sum,
  min,
  max,
  average,
  round,
  format,
  isValidDecimal,
  toExactString,
  isBalanced,
} = DecimalOperations;

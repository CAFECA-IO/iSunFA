/**
 * Decimal Compatibility Layer
 *
 * This file provides compatibility functions to bridge between
 * the old number-based interfaces and new string-based decimal interfaces.
 *
 * This allows for gradual migration without breaking existing functionality.
 */

import { DecimalOperations } from '@/lib/utils/decimal_operations';

export class DecimalCompatibility {
  /**
   * Convert number to decimal string
   */
  static numberToDecimal(value: number | string): string {
    if (typeof value === 'string') return value;
    return value.toString();
  }

  /**
   * Convert decimal string to number (for backwards compatibility)
   */
  static decimalToNumber(value: string | number): number {
    if (typeof value === 'number') return value;
    return parseFloat(value) || 0;
  }

  /**
   * Convert number array to decimal string array
   */
  static numberArrayToDecimalArray(values: number[]): string[] {
    return values.map((v) => v.toString());
  }

  /**
   * Convert decimal string array to number array (for backwards compatibility)
   */
  static decimalArrayToNumberArray(values: string[]): number[] {
    return values.map((v) => parseFloat(v) || 0);
  }

  /**
   * Safely compare values regardless of type
   */
  static isZero(value: string | number): boolean {
    if (typeof value === 'number') return value === 0;
    return DecimalOperations.isZero(value);
  }

  /**
   * Safely get absolute value regardless of type
   */
  static abs(value: string | number): string {
    if (typeof value === 'number') return Math.abs(value).toString();
    return DecimalOperations.abs(value);
  }

  /**
   * Safe addition regardless of type
   */
  static add(a: string | number, b: string | number): string {
    const aStr = this.numberToDecimal(a);
    const bStr = this.numberToDecimal(b);
    return DecimalOperations.add(aStr, bStr);
  }

  /**
   * Safe comparison regardless of type
   */
  static isNegative(value: string | number): boolean {
    if (typeof value === 'number') return value < 0;
    return DecimalOperations.isNegative(value);
  }

  /**
   * Format for display with proper locale formatting
   */
  static formatForDisplay(value: string | number): string {
    const numValue = this.decimalToNumber(value);
    return numValue.toLocaleString();
  }
}

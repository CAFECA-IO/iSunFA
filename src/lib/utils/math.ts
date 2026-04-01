/**
 * Info: (20260331 - Julian) 安全除法：避免除以 0
 * @param num - 分子
 * @param den - 分母
 * @returns 分子除以分母，若分母為 0 或 NaN，則回傳 0
 */
export function safeDivide(num: number, den: number): number {
  return den === 0 || isNaN(den) ? 0 : num / den;
}

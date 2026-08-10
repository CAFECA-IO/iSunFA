import { IEmployeeListItem } from "@/interfaces/hr_management";

export interface ITenure {
  years: number;
  months: number;
}

/**
 * Info: (20260810 - Julian) 計算年資（滿月數）。
 *
 * `referenceDate` 由呼叫端傳入而不是在函式內取 `new Date()`：
 * 一來純函式才測得起來，二來畫面上多個欄位共用同一個基準點，
 * 不會出現跨月零點時前後兩欄各算各的。
 *
 * 離職者以離職日為終點；未滿一個月回 `{ years: 0, months: 0 }`。
 */
export function calculateTenure(
  employee: IEmployeeListItem,
  referenceDate: Date,
): ITenure {
  const start = new Date(employee.hireDate);
  const end = employee.leaveDate ? new Date(employee.leaveDate) : referenceDate;

  let totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  // Info: (20260810 - Julian) 當月日數還沒到到職日的那一天，該月不算滿
  if (end.getDate() < start.getDate()) {
    totalMonths -= 1;
  }

  if (totalMonths < 0) {
    return { years: 0, months: 0 };
  }

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

/**
 * Info: (20260810 - Julian) 頭像用的縮寫。
 *
 * 中文姓名取後兩字（去掉姓氏後的名），英數姓名取首字母；
 * 直接 `slice(0, 2)` 會讓「陳」「陳」開頭的同事看起來一模一樣。
 */
export function getEmployeeInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "";

  const isLatin = /^[\x20-\x7E]+$/.test(trimmed);
  if (isLatin) {
    const parts = trimmed.split(/\s+/);
    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  return trimmed.slice(-2);
}

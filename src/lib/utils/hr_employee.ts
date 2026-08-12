import { IEmployeeListItem } from "@/interfaces/hr_management";
import { parseIsoDate } from "@/lib/utils/hr_date";

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
  /**
   * Info: (20260811 - Julian) 用 `parseIsoDate` 而不是 `new Date(employee.hireDate)`。
   *
   * `hireDate` / `leaveDate` 是 "YYYY-MM-DD" 字串，交給 `new Date()` 會被當成
   * UTC 午夜解析，在 UTC 以西的時區取 `getMonth()` / `getDate()` 會退一天 ——
   * 而下面整段計算都建立在這兩個值上。實測 4320 組（到職日 × 基準日）中有
   * 562 組會因為執行環境的時區不同而算出不同年資，例如 2024-01-01 到職、
   * 2026-12-31 為基準，台北算 2 年 11 個月，紐約算 3 年 0 個月。
   *
   * 這正是 `hr_date.ts` 檔頭警告的那個坑；那支工具存在的理由就是不要有人再踩。
   * 回歸測試在 `hr_employee.tz.test.ts`，固定跑在 America/New_York。
   */
  const start = parseIsoDate(employee.hireDate);
  const end = employee.leaveDate
    ? parseIsoDate(employee.leaveDate)
    : referenceDate;

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

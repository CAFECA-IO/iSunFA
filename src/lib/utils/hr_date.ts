/**
 * Info: (20260811 - Julian) 人事模組的日期工具。
 *
 * 一律以「本地時間的當日零時」為表示法，不用 `new Date("2026-08-10")`。
 * 後者會被當成 UTC 午夜解析，在 UTC 以西的時區取 `getDate()` 會退一天 ——
 * 到職日、生日、到期日在美洲時區會整批少一天，而且在台灣測不出來。
 */

// Info: (20260811 - Julian) 把 "YYYY-MM-DD" 解析成本地時間的當日零時
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso
    .slice(0, 10)
    .split("-")
    .map((part) => Number(part));
  return new Date(year, month - 1, day);
}

// Info: (20260811 - Julian) 轉回 "YYYY-MM-DD"，補零後長度固定
export function toIsoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Info: (20260811 - Julian) 月份鍵值 "YYYY-MM"，趨勢圖用它分組
export function toMonthKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Info: (20260811 - Julian) 加月份。`setMonth` 遇到 1/31 加一個月會溢位成 3/3，
 * 因此先夾到目標月的最後一天 —— 試用期滿日是從到職日推的，月底到職的人
 * 不該被算成下下個月才滿期。
 */
export function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
}

// Info: (20260811 - Julian) 相差天數（to - from），兩端都先歸零到當日
export function differenceInDays(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  /**
   * Info: (20260811 - Julian) 先四捨五入再轉整數：日光節約時間讓某些「一天」
   * 只有 23 小時，直接除會得到 0.958 天，`Math.floor` 會少算一天。
   */
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

// Info: (20260811 - Julian) 相差足歲年數，未滿週年不進位
export function differenceInFullYears(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  const beforeAnniversary =
    to.getMonth() < from.getMonth() ||
    (to.getMonth() === from.getMonth() && to.getDate() < from.getDate());
  if (beforeAnniversary) years -= 1;
  return years;
}

/**
 * Info: (20260811 - Julian) 相差足月數，未滿整月不進位。
 *
 * 預告期的門檻是「三個月以上」「一年以上」，用年數 × 12 近似會把
 * 到職 6 個月的人算成 0 個月 —— 於是應預告 10 天變成 0 天，那是法遵問題。
 */
export function differenceInFullMonths(from: Date, to: Date): number {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

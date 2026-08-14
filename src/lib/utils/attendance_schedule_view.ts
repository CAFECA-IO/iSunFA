import {
  OFF_DAY_TYPE_STYLE,
  SHIFT_PATTERN_PALETTE,
  WorkDayType,
} from "@/constants/attendance";
import {
  IScheduleDayCell,
  IScheduleRow,
  IShiftPatternSummary,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 排班月曆的顯示邏輯。純函數，不碰 React 也不碰網路。
 */

/**
 * Info: (20260813 - Julian) 格子上的班別簡稱。**唯一性是算出來的，不是希望出來的**——
 * 資料裡沒有簡稱欄位，取名稱第一個字在班別一多時會碰撞（例如「工地日班」與「工程師彈性班」
 * 都取「工」）。做法：先試一個字，全體唯一就用；有碰撞則整體升到兩個字；仍碰撞則退回 `code`。
 * 整體升級而非只加長碰撞的那幾個，否則同一張表上長度不一致會被誤讀成有意義。
 */
export function buildShiftLabels(
  patterns: IShiftPatternSummary[],
): Map<string, string> {
  const isUnique = (labels: string[]): boolean =>
    new Set(labels).size === labels.length;

  for (const length of [1, 2]) {
    const labels = patterns.map((pattern) => pattern.name.slice(0, length));
    if (isUnique(labels)) {
      return new Map(
        patterns.map((pattern, index) => [pattern.id, labels[index]]),
      );
    }
  }

  // Info: (20260813 - Julian) `code` 有 `@@unique([accountBookId, code])` 保證，是最後一道
  return new Map(patterns.map((pattern) => [pattern.id, pattern.code]));
}

/**
 * Info: (20260813 - Julian) 班別顏色。依清單順序取用而非用 id 雜湊：雜湊無法保證
 * 相鄰兩個班別不會拿到相近的顏色，而排班表要看的正是相鄰兩列的差異。
 */
export function buildShiftStyles(
  patterns: IShiftPatternSummary[],
): Map<string, string> {
  return new Map(
    patterns.map((pattern, index) => [
      pattern.id,
      SHIFT_PATTERN_PALETTE[index % SHIFT_PATTERN_PALETTE.length],
    ]),
  );
}

/**
 * Info: (20260813 - Julian) 一格的顏色：上班日取班別顏色、非上班日取語意固定的顏色、無排班留白。
 * **無排班不是「休假」**：前者是沒人排過，後者是明確排了不用上班，兩者在畫面上必須看得出差別。
 */
export function resolveScheduleCellStyle(
  cell: IScheduleDayCell,
  shiftStyles: Map<string, string>,
): string {
  if (cell.dayType === null) return "bg-transparent text-gray-300";
  if (cell.dayType === WorkDayType.WORK) {
    return (
      (cell.shiftPatternId && shiftStyles.get(cell.shiftPatternId)) ||
      "bg-gray-100 text-gray-500"
    );
  }
  return OFF_DAY_TYPE_STYLE[cell.dayType];
}

// Info: (20260813 - Julian) 出現在資料裡的部門，供下拉選單使用；不預設一份清單
export function scheduleDepartmentOptions(
  rows: IScheduleRow[],
): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.departmentId && row.departmentName) {
      seen.set(row.departmentId, row.departmentName);
    }
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

// Info: (20260813 - Julian) 依部門篩選。在前端做的理由見 `schedule_page_body` 的說明
export function filterScheduleRows(
  rows: IScheduleRow[],
  departmentId: string | null,
): IScheduleRow[] {
  if (!departmentId) return rows;
  return rows.filter((row) => row.departmentId === departmentId);
}

/**
 * Info: (20260813 - Julian) 把 A8 回傳的那一格換進矩陣裡。改完不重抓整個月，
 * 因為那只是把同一件事再問一遍；回傳新陣列而非就地改，讓 React 的參考比對能偵測到變更。
 */
export function applyCellUpdate(
  rows: IScheduleRow[],
  employeeId: string,
  cell: IScheduleDayCell,
): IScheduleRow[] {
  return rows.map((row) =>
    row.employeeId === employeeId
      ? {
          ...row,
          days: row.days.map((day) =>
            day.workDate === cell.workDate ? cell : day,
          ),
        }
      : row,
  );
}

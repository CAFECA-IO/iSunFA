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
 * Info: (20260813 - Julian) 格子上的班別簡稱。**唯一性是算出來的，不是希望出來的。**
 *
 * ## 問題
 *
 * 計畫書 §8.3 的示意圖用「九／早／晚／彈」這種一個字的簡稱，但**資料裡沒有這一欄** ——
 * 班別只有 `code`（SITE-DAY）與 `name`（工地日班）。取名稱的第一個字看起來可行，
 * 直到帳本裡同時有「工地日班」與「工程師彈性班」—— 兩個都是「工」。
 *
 * 那種碰撞在 demo 的四個班別下不會發生，在客戶的八個班別下一定會發生，
 * 而症狀是**排班表看起來完全正常、只是有兩欄的意思是反的**。
 *
 * ## 做法
 *
 * 取「能讓全體互不相同的最短前綴」：先試一個字，全體唯一就用它；
 * 有碰撞就整體升到兩個字；仍有碰撞就退回 `code`。
 * 因此這支函式**回傳的標籤集合必定互不相同**，而不是「通常互不相同」。
 *
 * 整體升級而不是只把碰撞的那幾個加長：一張表上有的是一個字、有的是兩個字，
 * 讀的人會以為那個長度有意義。
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
 * Info: (20260813 - Julian) 班別顏色。依清單順序取用，因此同一本帳本每次都一樣。
 *
 * 用順序而不是用 id 雜湊：雜湊的顏色在加入一個新班別時完全不會變，聽起來更好，
 * 但代價是**沒有任何辦法保證相鄰的兩個班別不會拿到相近的顏色** ——
 * 而排班表要看的正是相鄰兩列的差異。
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
 * Info: (20260813 - Julian) 一格的顏色。
 *
 * 三種情況：上班日取班別的顏色、非上班日取語意固定的顏色、無排班留白。
 * **無排班不是「休假」** —— 前者是這一天沒有人排過，後者是明確排了不用上班。
 * 排班表上這兩者必須看得出差別，否則「這個月還有幾天沒排」永遠算不出來。
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
 * Info: (20260813 - Julian) 把 A8 回傳的那一格換進矩陣裡。
 *
 * 改完不重抓整個月：A8 回的就是那一格的最新狀態，重抓一次
 * 只是把同一件事再問一遍，而中間那半秒的畫面會是舊的。
 *
 * 回傳新陣列而不是就地改：React 靠參考比對決定要不要重繪，
 * 就地改會讓表格看起來沒反應 —— 那是這類方格圖最常見的一種「明明存好了卻沒變」。
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

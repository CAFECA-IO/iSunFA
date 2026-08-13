import {
  AttendanceCellTone,
  AttendanceDayPhase,
  AttendanceDayStatus,
  AttendanceExceptionType,
  ATTENDANCE_FILTER_EXCEPTION_ONLY,
} from "@/constants/attendance";
import { HR_FILTER_ALL } from "@/constants/hr_management";
import {
  IAttendanceDayResult,
  IAttendanceExceptionItem,
  IAttendanceResultRow,
  IAttendanceResultSummary,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 出勤總覽的顯示邏輯。純函數，不碰 React 也不碰網路。
 *
 * 這一層存在的理由是「一格一個顏色」這個限制帶來的所有取捨 ——
 * 選哪一種異常代表這一天、什麼時候該留白、統計欄怎麼合併 ——
 * 都是會被質疑、也**應該**被質疑的決定。寫在元件裡，唯一的驗證方式是開瀏覽器看；
 * 抽出來之後它們有測試，而元件退回只負責排版。
 */

/**
 * Info: (20260813 - Julian) 一天可以同時成立多種異常，但一格只有一個顏色 ——
 * 因此必須先排出誰代表這一天。順序即嚴重度，由上而下第一個命中者勝出。
 *
 * ## 為什麼是這個順序
 *
 * `ABSENT` 在最上面：對出工查核而言「這個人沒來」是所有問題裡最大的一個。
 * 其次是兩種漏打卡 —— 它們代表**紀錄不完整、工時無從計算**，
 * 比「來了但晚了 47 分鐘」更難處理，因為後者至少算得出來。
 * `INSUFFICIENT_HOURS` 排最後：它通常與遲到或早退同時出現，
 * 而那兩者才是原因，工時不足只是結果。
 *
 * `SUSPICIOUS_JUMP` 列在最末且本期不會出現（G5 未實作）。列它是因為
 * 這個陣列同時是「共有哪幾種異常」的清單 —— 漏掉一項，
 * 未來實作 G5 的人不會收到任何提示，那一天就會被畫成沒有異常的顏色。
 */
export const EXCEPTION_SEVERITY_ORDER: AttendanceExceptionType[] = [
  AttendanceExceptionType.ABSENT,
  AttendanceExceptionType.MISSING_CLOCK_IN,
  AttendanceExceptionType.MISSING_CLOCK_OUT,
  AttendanceExceptionType.LATE,
  AttendanceExceptionType.EARLY_LEAVE,
  AttendanceExceptionType.INSUFFICIENT_HOURS,
  AttendanceExceptionType.SUSPICIOUS_JUMP,
];

const TONE_BY_EXCEPTION: Record<AttendanceExceptionType, AttendanceCellTone> = {
  [AttendanceExceptionType.ABSENT]: AttendanceCellTone.ABSENT,
  [AttendanceExceptionType.MISSING_CLOCK_IN]: AttendanceCellTone.MISSING_PUNCH,
  [AttendanceExceptionType.MISSING_CLOCK_OUT]: AttendanceCellTone.MISSING_PUNCH,
  [AttendanceExceptionType.LATE]: AttendanceCellTone.LATE,
  [AttendanceExceptionType.EARLY_LEAVE]: AttendanceCellTone.EARLY_LEAVE,
  [AttendanceExceptionType.INSUFFICIENT_HOURS]:
    AttendanceCellTone.INSUFFICIENT_HOURS,
  // Info: (20260813 - Julian) G5 未實作；有了實作再決定它自己的顏色
  [AttendanceExceptionType.SUSPICIOUS_JUMP]: AttendanceCellTone.MISSING_PUNCH,
};

/**
 * Info: (20260813 - Julian) 代表這一天的那一筆異常。無異常時回 null。
 *
 * 引擎回傳的順序是判定表的順序，不是嚴重度 —— 直接取 `exceptions[0]`
 * 會讓「遲到 + 工時不足」的那天以工時不足的顏色出現，而遲到才是要講的事。
 */
export function dominantException(
  day: IAttendanceDayResult,
): IAttendanceExceptionItem | null {
  for (const type of EXCEPTION_SEVERITY_ORDER) {
    const matched = day.exceptions.find((item) => item.type === type);
    if (matched) return matched;
  }
  // Info: (20260813 - Julian) 落到這裡代表引擎回了一種本表沒列的異常：寧可回第一筆也不要回 null
  return day.exceptions[0] ?? null;
}

/**
 * Info: (20260813 - Julian) 一格的顏色。
 *
 * **`NORMAL` 只在這一天已經過完時才是綠色。** 引擎的 `NORMAL` 意思是
 * 「目前查不到異常」—— 對還沒開始的工作日它回的也是 `NORMAL`。
 * 把它畫成綠色，就是對一個尚未發生的日子宣稱「這天正常出勤」。
 *
 * 反過來，進行中的日子若**已經**有異常（例如中午就打了下班卡），
 * 那個異常是已經成立的事實，照常上色 —— 只是格子另外標記為尚未結束。
 */
export function resolveCellTone(day: IAttendanceDayResult): AttendanceCellTone {
  if (day.status === AttendanceDayStatus.NO_SCHEDULE) {
    return AttendanceCellTone.NO_SCHEDULE;
  }
  if (day.status === AttendanceDayStatus.OFF_DAY) {
    return AttendanceCellTone.OFF_DAY;
  }

  const exception = dominantException(day);
  if (exception) return TONE_BY_EXCEPTION[exception.type];

  return day.phase === AttendanceDayPhase.CONCLUDED
    ? AttendanceCellTone.NORMAL
    : AttendanceCellTone.PENDING;
}

/**
 * Info: (20260813 - Julian) 這一格是否還藏著別的異常。
 *
 * 顏色只表達得了一種，而「遲到 47 分」與「遲到 47 分且工時不足 120 分」
 * 在畫面上會長得一模一樣。格子必須自己說出「還有」，
 * 否則使用者沒有理由去點開它 —— 而看不到的資訊等於不存在。
 */
export function hasHiddenExceptions(day: IAttendanceDayResult): boolean {
  return day.exceptions.length > 1;
}

/**
 * Info: (20260813 - Julian) 統計欄。`types` 可以有多個，用於合併上下班漏打卡。
 *
 * **沒有 `SUSPICIOUS_JUMP` 這一欄，而且是刻意的。** 為一條沒有實作的規則
 * 開一欄並填上 0，等於在報表上宣稱「查過了、沒有」——
 * 與 API 不回傳零筆統計是同一條理由（服務層 §summary 的說明）。
 */
export interface IAttendanceSummaryColumn {
  key: string;
  types: AttendanceExceptionType[];
}

export const ATTENDANCE_SUMMARY_COLUMNS: IAttendanceSummaryColumn[] = [
  { key: "late", types: [AttendanceExceptionType.LATE] },
  { key: "early_leave", types: [AttendanceExceptionType.EARLY_LEAVE] },
  { key: "absent", types: [AttendanceExceptionType.ABSENT] },
  {
    /**
     * Info: (20260813 - Julian) 兩種漏打卡相加不會重複計算：引擎的判定表
     * #6 與 #7 是互斥的兩條提前返回，同一天不可能同時產生兩者。
     */
    key: "missing_punch",
    types: [
      AttendanceExceptionType.MISSING_CLOCK_IN,
      AttendanceExceptionType.MISSING_CLOCK_OUT,
    ],
  },
  {
    key: "insufficient_hours",
    types: [AttendanceExceptionType.INSUFFICIENT_HOURS],
  },
];

export function countExceptionDays(
  summary: IAttendanceResultSummary,
  types: AttendanceExceptionType[],
): number {
  return summary.exceptions
    .filter((tally) => types.includes(tally.type))
    .reduce((total, tally) => total + tally.days, 0);
}

export interface IAttendanceResultFilter {
  keyword: string;
  departmentName: string;
  /** Info: (20260813 - Julian) `HR_FILTER_ALL`、`ATTENDANCE_FILTER_EXCEPTION_ONLY`，或某個異常型別 */
  exception: string;
}

/**
 * Info: (20260813 - Julian) 篩選是**列層級**的：符合條件的員工整列留下，格子不動。
 *
 * 另一種做法是把不符合的格子也淡化掉，但那會讓「這個人這個月還有哪些狀況」
 * 消失 —— 而看一列出勤時，上下文正是判斷的依據
 * （8/12 遲到之前的 8/11 是不是也遲到，決定了它是不是偶發）。
 */
export function filterResultRows(
  rows: IAttendanceResultRow[],
  filter: IAttendanceResultFilter,
): IAttendanceResultRow[] {
  const keyword = filter.keyword.trim().toLowerCase();

  return rows.filter((row) => {
    const matchedKeyword =
      keyword === "" ||
      row.name.toLowerCase().includes(keyword) ||
      row.employeeNo.toLowerCase().includes(keyword);

    const matchedDepartment =
      filter.departmentName === HR_FILTER_ALL ||
      row.departmentName === filter.departmentName;

    const matchedException =
      filter.exception === HR_FILTER_ALL ||
      (filter.exception === ATTENDANCE_FILTER_EXCEPTION_ONLY
        ? row.summary.exceptionDays > 0
        : row.summary.exceptions.some(
            (tally) => tally.type === filter.exception,
          ));

    return matchedKeyword && matchedDepartment && matchedException;
  });
}

// Info: (20260813 - Julian) 出現在資料裡的部門，供下拉選單使用；不預設一份清單
export function departmentOptionsOf(rows: IAttendanceResultRow[]): string[] {
  return [
    ...new Set(
      rows
        .map((row) => row.departmentName)
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

/**
 * Info: (20260813 - Julian) "YYYY-MM" → 該月的第一天與最後一天。
 *
 * 以 `Date.UTC(year, month, 0)` 取上個月的最後一天（月份索引從 0 起算，
 * 傳入 `month` 即下個月，第 0 天就是本月最後一天），避免自己維護閏年表。
 * 全程走 UTC：這裡處理的是日曆概念，一旦沾到本地時區，
 * UTC 以西的使用者在月初當天會拿到上個月。
 */
export function monthRange(isoMonth: string): { from: string; to: string } {
  const [year, month] = isoMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    from: `${isoMonth}-01`,
    to: `${isoMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

// Info: (20260813 - Julian) 月份前後移動，跨年由 Date.UTC 自己處理
export function shiftIsoMonth(isoMonth: string, delta: number): string {
  const [year, month] = isoMonth.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Info: (20260813 - Julian) "2026-08-13" → "2026-08"
export function isoMonthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

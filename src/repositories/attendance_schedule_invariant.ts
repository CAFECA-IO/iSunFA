import { WorkDayType } from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 排班日的「型別與班別必須一致」不變式：`dayType` 與
 * `shiftPatternId` 必須同進退，否則寫得進去但讀出來會說謊（上班日沒班別會被判定引擎當成無排班；休假日掛班別會讓排班畫面顯示不存在的班次）。
 *
 * 不拆表：拆成 `ScheduledWorkDay` / `ScheduledOffDay` 會弄丟
 * `@@unique([accountBookId, employeeId, workDate])`，讓「同一人同一天既排班又排休」變成新的非法狀態，反而更糟（計畫書 §D2）。
 *
 * 擋在 repository 而非 service：repository 是唯一的 DB 閘口，種子腳本、資料遷移、
 * 批次匯入都會經過這裡，尤其排班表 Excel 匯入是一次寫入上千筆、最可能配錯欄位的地方。
 */
export class AttendanceScheduleInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`EmployeeShiftDay: ${reason} (${detail})`);
    this.name = "AttendanceScheduleInvariantError";
  }
}

export interface ISchedulableDay {
  dayType: WorkDayType;
  shiftPatternId: string | null | undefined;
  /**
   * Info: (20260817 - Julian) 「這天本來要上幾分鐘」的快照，僅非上班日有意義。
   * 選填：既有呼叫端不傳即視為 null（既有資料本來就是 null）。
   */
  plannedWorkMinutes?: number | null;
}

// Info: (20260813 - Julian) 寫入前檢查，違反即丟具名錯誤，由 service 層轉成驗證錯誤——不轉譯會讓呼叫端收到與成因無關的 500
export function assertSchedulableDay(params: ISchedulableDay): void {
  const isWorkDay = params.dayType === WorkDayType.WORK;
  const hasShiftPattern = Boolean(params.shiftPatternId);

  if (isWorkDay && !hasShiftPattern) {
    throw new AttendanceScheduleInvariantError(
      "a work day was scheduled without a shift pattern; the day would evaluate as unscheduled",
      `dayType=${params.dayType}, shiftPatternId=${params.shiftPatternId}`,
    );
  }

  // Info: (20260813 - Julian) 反方向也擋：休假日掛著班別不影響判定（引擎看非 WORK 就直接回 OFF_DAY），但會讓排班月曆畫出一個不存在於任何判定的班次
  if (!isWorkDay && hasShiftPattern) {
    throw new AttendanceScheduleInvariantError(
      "a non-working day carries a shift pattern; the calendar would show a shift that no evaluation uses",
      `dayType=${params.dayType}, shiftPatternId=${params.shiftPatternId}`,
    );
  }

  /**
   * Info: (20260817 - Julian) 上班日不得留著 `plannedWorkMinutes`。
   *
   * 那個欄位的存在理由是「班別被清成 null 之後，這天本來要上幾分鐘仍查得到」——
   * 而上班日的班別還在，`shiftPattern.requiredWorkMinutes` 才是唯一來源。
   * 兩者同時存在就會有兩個可以互相矛盾的答案：銷假把某天投影回 `WORK`
   * 卻沒清掉舊快照，之後有人改了班別，那個快照就開始說謊。
   *
   * 形狀與上面兩條完全相同 —— 同一個欄位在某個 `dayType` 下有意義、
   * 在另一個下必須為空。
   */
  if (
    isWorkDay &&
    params.plannedWorkMinutes !== null &&
    params.plannedWorkMinutes !== undefined
  ) {
    throw new AttendanceScheduleInvariantError(
      "a work day carries a plannedWorkMinutes snapshot; the shift pattern is the only source and the two can diverge",
      `dayType=${params.dayType}, plannedWorkMinutes=${params.plannedWorkMinutes}`,
    );
  }
}

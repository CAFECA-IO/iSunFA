import { WorkDayType } from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 排班日的「型別與班別必須一致」不變式。
 *
 * ## 這條規則守的是什麼
 *
 * `EmployeeShiftDay` 有兩個必須同進退的欄位：`dayType` 與 `shiftPatternId`。
 * 上班日沒有班別，判定引擎就沒有比較基準，那一天會被算成「沒有排班」——
 * 但它明明排了班，只是班別掉了。反過來，休假日掛著班別，
 * 則會讓排班畫面顯示一個不該存在的班次。
 *
 * 兩種都是**寫得進去、但讀出來會說謊**的紀錄。
 *
 * ## 為什麼不拆表（ADR 019 的判準在這裡指向另一邊）
 *
 * ADR 019 對 `ProcessTask` 的解法是拆成兩張表，讓非法狀態不可表示。
 * 這裡拆成 `ScheduledWorkDay` / `ScheduledOffDay` 之後，
 * 會**弄丟 `@@unique([accountBookId, employeeId, workDate])`** ——
 * 兩張表各自唯一，跨表無法約束，於是「同一人同一天既排班又排休」
 * 變成新的非法狀態，而那正是 ADR 019 §1 表格裡評為「最惡劣」的第 3 種：
 * 兩個都合法、但互相矛盾的事實。
 *
 * **判準不是「有沒有 discriminator 欄位」，是「拆完之後非法狀態的總量有沒有變少」。**
 * 這裡沒有變少，反而弄丟了資料庫層級的保證（那條唯一鍵擋掉的是排班表最常見的
 * 操作錯誤：重複匯入），所以維持單表 + 不變式。完整論證見計畫書 §D2。
 *
 * ## 為什麼擋在 repository 而不是 service
 *
 * 理由完全比照 `hr_pii_invariant.ts`：擋在 service 擋不住繞過它的寫入 ——
 * 種子腳本、資料遷移、批次匯入，以及未來的排班表 Excel 匯入。
 * repository 是唯一的 DB 閘口，那些路徑全部會經過這裡。
 * **排班表匯入尤其**：那正是一次寫入上千筆、且最可能把兩個欄位配錯的地方。
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
}

/**
 * Info: (20260813 - Julian) 寫入前檢查；違反即丟具名錯誤，由 service 層轉成驗證錯誤。
 *
 * 丟具名型別的理由同碳盤查與人事個資：service 一律把 catch 到的東西包成
 * `IS_DB_FAILED`(500)，而這個守衛觸發時資料庫完全正常，
 * 呼叫端會收到一個與成因無關的 500。
 */
export function assertSchedulableDay(params: ISchedulableDay): void {
  const isWorkDay = params.dayType === WorkDayType.WORK;
  const hasShiftPattern = Boolean(params.shiftPatternId);

  if (isWorkDay && !hasShiftPattern) {
    throw new AttendanceScheduleInvariantError(
      "a work day was scheduled without a shift pattern; the day would evaluate as unscheduled",
      `dayType=${params.dayType}, shiftPatternId=${params.shiftPatternId}`,
    );
  }

  /**
   * Info: (20260813 - Julian) 反方向也擋：休假日卻掛著班別。
   *
   * 這個方向不會讓判定出錯（引擎看到非 WORK 就直接回 OFF_DAY，不看班別），
   * 擋它的理由不同 —— 排班月曆會照著 `shiftPatternId` 畫，於是畫面上會出現
   * 一個「例假日排了早班」的格子，而那個班次不存在於任何判定裡。
   * 使用者看到的與系統認定的是兩件事，這正是 ADR 019 說的第三種真相。
   */
  if (!isWorkDay && hasShiftPattern) {
    throw new AttendanceScheduleInvariantError(
      "a non-working day carries a shift pattern; the calendar would show a shift that no evaluation uses",
      `dayType=${params.dayType}, shiftPatternId=${params.shiftPatternId}`,
    );
  }
}

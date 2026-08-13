import {
  DEMO_ATTENDANCE_MAX_RANGE_DAYS,
  WorkDayType,
} from "@/constants/attendance";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { deriveShiftPatternKind } from "@/lib/attendance_rules";
import { toShiftWindow } from "@/lib/attendance_schedule_view";
import { enumerateIsoDates, isoDaySpan } from "@/lib/utils/attendance_time";
import {
  IScheduleCalendar,
  IScheduleDayCell,
  IScheduleRow,
  IShiftPatternSummary,
} from "@/interfaces/attendance";
import {
  IAttendanceScheduleQuery,
  IAttendanceScheduleUpdate,
} from "@/validators/attendance";
import {
  employeeRepo,
  IEmployeeRepository,
} from "@/repositories/employee.repo";
import {
  attendanceScheduleRepo,
  IAttendanceScheduleRepository,
  IShiftDayWithPattern,
} from "@/repositories/attendance_schedule.repo";
import {
  IShiftPatternRepository,
  shiftPatternRepo,
} from "@/repositories/shift_pattern.repo";
import { AttendanceScheduleInvariantError } from "@/repositories/attendance_schedule_invariant";

/**
 * Info: (20260813 - Julian) 班別與排班（A6 / A7 / A8）。
 *
 * ## 這一支管的是判定的「輸入」
 *
 * 判定矩陣（A9）是系統算出來的，排班是人排出來的 —— 而排班是判定的輸入之一。
 * 兩者分成兩支端點，因為排班畫面必須能在判定之外獨立存在：
 * 下個月的班表現在就排得出來，那時還沒有任何打卡可判。
 *
 * ## 非法狀態擋在三層，各自服務不同的呼叫者
 *
 * 1. **TypeScript**：`IDaySchedule` 是可辨識聯集，「上班日沒有班別」寫不出來
 * 2. **Zod**（本層的入口）：同樣的聯集，讓那種請求連解析都過不了
 * 3. **`assertSchedulableDay`**（repository）：擋種子腳本、資料遷移、Excel 匯入
 *
 * 三層不是重複。前兩層擋的是走 API 的呼叫者，第三層擋的是繞過 API 的路徑 ——
 * 而排班表匯入正是一次寫入上千筆、最可能把兩個欄位配錯的地方。
 */

const toCell = (
  workDate: string,
  day: IShiftDayWithPattern | undefined,
): IScheduleDayCell => {
  const shift = day ? toShiftWindow(day) : null;
  return {
    workDate,
    // Info: (20260813 - Julian) Prisma 回字面量聯集，`WorkDayType` 是 TS enum；值域一致由 enum mirror 測試保證
    dayType: day ? (day.dayType as WorkDayType) : null,
    shiftPatternId: day?.shiftPatternId ?? null,
    shiftCode: day?.shiftPattern?.code ?? null,
    shiftName: day?.shiftPattern?.name ?? null,
    shiftKind: shift ? deriveShiftPatternKind(shift) : null,
  };
};

export class AttendanceScheduleService {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly schedule: IAttendanceScheduleRepository,
    private readonly patterns: IShiftPatternRepository,
  ) {}

  /**
   * Info: (20260813 - Julian) A6：班別清單。
   *
   * `kind`（固定／彈性）由六個欄位的值**衍生**，不是資料庫欄位 ——
   * 固定班就是「窗＝核心」的彈性班（§D1）。存一個判別欄位唯一能做的事
   * 就是在有人改了時間卻忘了改它的那一天開始說謊。
   */
  public async listShiftPatterns(
    accountBookId: string,
  ): Promise<IShiftPatternSummary[]> {
    const patterns = await this.patterns.findByAccountBook(accountBookId);

    return patterns.map((pattern) => {
      const window = {
        windowStartMinute: pattern.windowStartMinute,
        windowEndMinute: pattern.windowEndMinute,
        coreStartMinute: pattern.coreStartMinute,
        coreEndMinute: pattern.coreEndMinute,
        requiredWorkMinutes: pattern.requiredWorkMinutes,
        breakMinutes: pattern.breakMinutes,
      };
      return {
        id: pattern.id,
        code: pattern.code,
        name: pattern.name,
        kind: deriveShiftPatternKind(window),
        window,
      };
    });
  }

  // Info: (20260813 - Julian) A7：排班月曆（部門 × 月）
  public async getCalendar(params: {
    accountBookId: string;
    query: IAttendanceScheduleQuery;
  }): Promise<IScheduleCalendar> {
    const { accountBookId } = params;
    const { from, to, departmentId } = params.query;

    /**
     * Info: (20260813 - Julian) 區間上限與判定矩陣共用一個常數。
     *
     * 兩支端點的成本結構相同（名冊 × 天數），訂成兩個數字，
     * 遲早會出現「總覽看得到、班表看不到」這種說不出理由的不一致。
     */
    if (isoDaySpan(from, to) > DEMO_ATTENDANCE_MAX_RANGE_DAYS) {
      throw new AppError(API_ERRORS.VA_ATTENDANCE_RANGE_TOO_LARGE);
    }

    const workDates = enumerateIsoDates(from, to);
    const roster = await this.employees.findRosterInPeriod({
      accountBookId,
      from,
      to,
      departmentId,
    });

    if (roster.length === 0) return { from, to, workDates, rows: [] };

    const shiftDays = await this.schedule.findShiftDaysInRange({
      accountBookId,
      employeeIds: roster.map((employee) => employee.id),
      from,
      to,
    });

    const index = new Map<string, Map<string, IShiftDayWithPattern>>();
    for (const day of shiftDays) {
      const byDate = index.get(day.employeeId) ?? new Map();
      // Info: (20260813 - Julian) 一人一天最多一筆，由 @@unique 保證，因此直接覆寫
      byDate.set(day.workDate, day);
      index.set(day.employeeId, byDate);
    }

    const rows: IScheduleRow[] = roster.map((employee) => ({
      employeeId: employee.id,
      employeeNo: employee.employeeNo,
      name: employee.name,
      departmentId: employee.departmentId,
      departmentName: employee.department?.name ?? null,
      jobTitle: employee.jobTitle?.title ?? null,
      days: workDates.map((workDate) =>
        toCell(workDate, index.get(employee.id)?.get(workDate)),
      ),
    }));

    return { from, to, workDates, rows };
  }

  /**
   * Info: (20260813 - Julian) A8：改單日排班。
   *
   * ToDo: (20260813 - Julian) **這個動作沒有留下任何軌跡，而它會改寫歷史判定。**
   *
   * 判定結果是即時算的（A9 不讀結果表），因此把 8/12 從上班日改成休假，
   * 那一天的曠職就當場消失 —— 沒有任何地方記得「誰在什麼時候改的、原本是什麼」。
   * 對出工查核而言那是一個真正的洞：出勤紀錄本身是 append-only（打卡改不了），
   * 但它的**比較基準**可以被無聲地改掉。
   *
   * 正式版需要排班異動軌跡（母文件目前沒有這一節）。做法有兩條：
   * 排班本身改成 append-only 加生效版本，或新增 `AuditLogDataType`
   * 的排班類別。前者較貴但能重建任一時點的班表，後者便宜且足以回答
   * 「誰改的」。Demo 階段只留這行日誌。
   */
  public async updateScheduleDay(params: {
    accountBookId: string;
    input: IAttendanceScheduleUpdate;
    actorEmployeeNo: string;
  }): Promise<IScheduleDayCell> {
    const { accountBookId, input, actorEmployeeNo } = params;

    const employee = await this.employees.findByIdInAccountBook(
      accountBookId,
      input.employeeId,
    );
    if (!employee) throw new AppError(API_ERRORS.NF_EMPLOYEE);

    /**
     * Info: (20260813 - Julian) 班別也要綁帳本確認一次。
     *
     * `EmployeeShiftDay.shiftPatternId` 在資料庫層沒有跨帳本約束 ——
     * 少了這一步，帶一個別家帳本的班別 id 就寫得進去，
     * 而症狀要等到有人發現自己的班表出現沒看過的班次才會浮現。
     */
    if (input.shiftPatternId) {
      const pattern = await this.patterns.findByIdInAccountBook(
        accountBookId,
        input.shiftPatternId,
      );
      if (!pattern) throw new AppError(API_ERRORS.NF_SHIFT_PATTERN);
    }

    try {
      const saved = await this.schedule.upsertShiftDay({
        accountBookId,
        employeeId: input.employeeId,
        workDate: input.workDate,
        dayType: input.dayType,
        shiftPatternId: input.shiftPatternId,
      });

      logger.info(
        `[attendance] schedule updated by ${actorEmployeeNo}: ${employee.employeeNo} ${input.workDate} -> ${input.dayType}${
          input.shiftPatternId ? ` (${input.shiftPatternId})` : ""
        }`,
      );

      return toCell(input.workDate, saved);
    } catch (error) {
      /**
       * Info: (20260813 - Julian) 不變式違反轉成 400，不讓它變成 500。
       *
       * 走 API 到不了這裡（zod 的聯集已經擋掉），但 repository 的守衛
       * 丟的是具名錯誤而不是資料庫錯誤 —— 若不轉譯，呼叫端會收到一個
       * 「資料庫失敗」的 500，而資料庫完全正常。
       */
      if (error instanceof AttendanceScheduleInvariantError) {
        throw new AppError(API_ERRORS.VA_SCHEDULE_DAY_INVALID);
      }
      throw error;
    }
  }
}

export const attendanceScheduleService = new AttendanceScheduleService(
  employeeRepo,
  attendanceScheduleRepo,
  shiftPatternRepo,
);

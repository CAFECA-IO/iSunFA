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
 * Info: (20260813 - Julian) 班別與排班（A6 / A7 / A8）。排班是判定矩陣（A9）的輸入之一，
 * 兩者分開端點是因為排班必須能獨立於判定存在（下個月的班表現在就能排）。
 *
 * 非法狀態擋在三層：TypeScript 可辨識聯集、Zod（本層入口）、
 * `assertSchedulableDay`（repository，擋種子腳本／匯入等繞過 API 的路徑）。
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

  // Info: (20260813 - Julian) A6：班別清單。`kind`（固定／彈性）由六個欄位衍生，不是資料庫欄位——存判別欄位只會在有人改時間忘了同步改它時開始說謊
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

    // Info: (20260813 - Julian) 區間上限與判定矩陣（A9）共用同一常數，避免「總覽看得到、班表看不到」的不一致
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
   * ToDo: (20260813 - Julian) 這個動作沒有留下任何軌跡，而它會改寫歷史判定——
   * 判定結果即時算（A9 不讀結果表），把 8/12 從上班日改成休假，那天的曠職
   * 就當場消失，沒有任何地方記得「誰在什麼時候改的、原本是什麼」。
   * 正式版需要排班異動軌跡：排班改成 append-only 加生效版本（貴，但能重建
   * 任一時點的班表），或新增 `AuditLogDataType` 的排班類別（便宜，足以回答
   * 「誰改的」）。Demo 階段只留這行日誌。
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

    // Info: (20260813 - Julian) 班別也要綁帳本確認一次——DB 層沒有跨帳本約束，少這一步會讓別家帳本的班別 id 寫得進去
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
      // Info: (20260813 - Julian) 不變式違反轉成 400，不讓它變成 500——repository 的守衛丟的是具名錯誤，不轉譯會讓呼叫端誤以為資料庫失敗
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

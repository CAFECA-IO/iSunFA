import { AttendancePunch } from "@/generated";
import {
  AttendanceDayPhase,
  AttendanceDayStatus,
  DEMO_ATTENDANCE_MAX_RANGE_DAYS,
  DEMO_EARLY_LEAVE_GRACE_MINUTES,
  DEMO_LATE_GRACE_MINUTES,
  DEMO_MISSING_CLOCK_OUT_GRACE_MINUTES,
  DEMO_TIME_ZONE,
  MINUTES_PER_DAY,
  PunchType,
  WorkDayType,
} from "@/constants/attendance";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  ATTENDANCE_ENGINE_VERSION,
  deriveShiftPatternKind,
  evaluateAttendanceDay,
} from "@/lib/attendance_rules";
import { toDaySchedule, toShiftWindow } from "@/lib/attendance_schedule_view";
import {
  enumerateIsoDates,
  isoDaySpan,
  minutesFromWorkDateStart,
} from "@/lib/utils/attendance_time";
import {
  IAttendanceDayResult,
  IAttendanceExceptionItem,
  IAttendanceExceptionTally,
  IAttendancePolicySnapshot,
  IAttendanceResultMatrix,
  IAttendanceResultRow,
  IAttendanceResultSummary,
  IPunchSnapshot,
  IShiftWindow,
} from "@/interfaces/attendance";
import { IAttendanceResultQuery } from "@/validators/attendance";
import {
  employeeRepo,
  IAttendanceRosterRow,
  IEmployeeRepository,
} from "@/repositories/employee.repo";
import {
  attendanceScheduleRepo,
  IAttendanceScheduleRepository,
  IShiftDayWithPattern,
} from "@/repositories/attendance_schedule.repo";
import {
  attendancePunchRepo,
  IAttendancePunchRepository,
} from "@/repositories/attendance_punch.repo";

/**
 * Info: (20260813 - Julian) 出勤判定結果（A9）。即時計算，不讀結果表。
 *
 * 判定是排班、打卡、政策、規則版本四者的純函數，落地會產生第二份可能過期的
 * 真相（同 ADR 019 對 `ProcessTaskType`／`MovementStage` 的處理）。
 * `evaluatedAt` 由呼叫端注入、貫穿整條計算，service 內不呼叫 `new Date()`，
 * 確保整張矩陣共用同一個時間點。
 */

// Info: (20260813 - Julian) Demo 政策；正式版改讀帳本層級的 `AttendancePolicy`
const DEMO_POLICY: IAttendancePolicySnapshot = {
  lateGraceMinutes: DEMO_LATE_GRACE_MINUTES,
  earlyLeaveGraceMinutes: DEMO_EARLY_LEAVE_GRACE_MINUTES,
  missingClockOutGraceMinutes: DEMO_MISSING_CLOCK_OUT_GRACE_MINUTES,
};

// Info: (20260813 - Julian) Prisma 回字面量聯集，`IPunchSnapshot` 要 TS enum；值域一致由 hr_enum_mirror.test.ts 保證
const toPunchType = (value: string): PunchType => value as PunchType;

// Info: (20260813 - Julian) 邊界取「窗迄 + 漏打下班卡寬限」而非日曆換日，避免夜班每天早八小時變色；無班別退回整個日曆日
const resolvePhase = (
  nowMinuteOfDay: number,
  shift: IShiftWindow | null,
  policy: IAttendancePolicySnapshot,
): AttendanceDayPhase => {
  const start = shift ? shift.windowStartMinute : 0;
  const end = shift
    ? shift.windowEndMinute + policy.missingClockOutGraceMinutes
    : MINUTES_PER_DAY;

  if (nowMinuteOfDay < start) return AttendanceDayPhase.UPCOMING;
  if (nowMinuteOfDay > end) return AttendanceDayPhase.CONCLUDED;
  return AttendanceDayPhase.IN_PROGRESS;
};

// Info: (20260813 - Julian) 巢狀 Map 而不是把兩個 id 串成字串當鍵：省掉「分隔符會不會撞」這個問題
const groupByEmployeeAndDate = <T>(
  items: T[],
  employeeIdOf: (item: T) => string,
  workDateOf: (item: T) => string,
): Map<string, Map<string, T[]>> => {
  const result = new Map<string, Map<string, T[]>>();
  for (const item of items) {
    const employeeId = employeeIdOf(item);
    const workDate = workDateOf(item);
    const byDate = result.get(employeeId) ?? new Map<string, T[]>();
    byDate.set(workDate, [...(byDate.get(workDate) ?? []), item]);
    result.set(employeeId, byDate);
  }
  return result;
};

const tallyExceptions = (
  days: IAttendanceDayResult[],
): IAttendanceExceptionTally[] => {
  const tally = new Map<string, IAttendanceExceptionTally>();

  const accumulate = (item: IAttendanceExceptionItem): void => {
    const current = tally.get(item.type) ?? {
      type: item.type,
      days: 0,
      minutes: 0,
    };
    tally.set(item.type, {
      type: item.type,
      days: current.days + 1,
      minutes: current.minutes + item.minutes,
    });
  };

  for (const day of days) day.exceptions.forEach(accumulate);

  // Info: (20260813 - Julian) 固定排序，否則同一份資料兩次查詢的欄位順序可能不同
  return [...tally.values()].sort((a, b) => a.type.localeCompare(b.type));
};

const summarise = (days: IAttendanceDayResult[]): IAttendanceResultSummary => {
  // Info: (20260813 - Julian) 上班日以 dayType 認定，不以「有沒有班別名稱」推測
  const workDays = days.filter((day) => day.dayType === WorkDayType.WORK);

  return {
    scheduledWorkDays: workDays.length,
    normalDays: workDays.filter(
      (day) =>
        day.status === AttendanceDayStatus.NORMAL &&
        day.phase === AttendanceDayPhase.CONCLUDED,
    ).length,
    exceptionDays: days.filter(
      (day) => day.status === AttendanceDayStatus.EXCEPTION,
    ).length,
    pendingDays: workDays.filter(
      (day) => day.phase !== AttendanceDayPhase.CONCLUDED,
    ).length,
    offDays: days.filter((day) => day.status === AttendanceDayStatus.OFF_DAY)
      .length,
    noScheduleDays: days.filter(
      (day) => day.status === AttendanceDayStatus.NO_SCHEDULE,
    ).length,
    workedMinutes: days.reduce((total, day) => total + day.workedMinutes, 0),
    exceptions: tallyExceptions(days),
  };
};

export class AttendanceResultService {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly schedule: IAttendanceScheduleRepository,
    private readonly punches: IAttendancePunchRepository,
    private readonly timeZone: string = DEMO_TIME_ZONE,
  ) {}

  public async evaluateRange(params: {
    accountBookId: string;
    query: IAttendanceResultQuery;
    evaluatedAt: Date;
  }): Promise<IAttendanceResultMatrix> {
    const { accountBookId, query, evaluatedAt } = params;
    const { from, to, employeeId } = query;

    if (isoDaySpan(from, to) > DEMO_ATTENDANCE_MAX_RANGE_DAYS) {
      throw new AppError(API_ERRORS.VA_ATTENDANCE_RANGE_TOO_LARGE);
    }

    const workDates = enumerateIsoDates(from, to);

    // Info: (20260813 - Julian) 指定的員工不在名冊時回空矩陣，不是 404——避免洩漏「id 是否存在」與「尚未到職/已離職」的區別
    const roster = await this.employees.findRosterInPeriod({
      accountBookId,
      from,
      to,
      employeeId,
    });

    const base = {
      from,
      to,
      workDates,
      timeZone: this.timeZone,
      evaluatedAt: evaluatedAt.toISOString(),
      engineVersion: ATTENDANCE_ENGINE_VERSION,
    };

    if (roster.length === 0) return { ...base, rows: [] };

    const employeeIds = roster.map((employee) => employee.id);
    const [shiftDays, punches] = await Promise.all([
      this.schedule.findShiftDaysInRange({
        accountBookId,
        employeeIds,
        from,
        to,
      }),
      this.punches.findByWorkDateRange({
        accountBookId,
        employeeIds,
        from,
        to,
      }),
    ]);

    const scheduleIndex = groupByEmployeeAndDate(
      shiftDays,
      (day) => day.employeeId,
      (day) => day.workDate,
    );
    const punchIndex = groupByEmployeeAndDate(
      punches,
      (punch) => punch.employeeId,
      (punch) => punch.workDate,
    );

    // Info: (20260813 - Julian) 每個工作日的「現在」只算一次，全體員工共用
    const nowByWorkDate = new Map(
      workDates.map((workDate) => [
        workDate,
        minutesFromWorkDateStart(evaluatedAt, workDate, this.timeZone),
      ]),
    );

    return {
      ...base,
      rows: roster.map((employee) =>
        this.buildRow({
          employee,
          workDates,
          nowByWorkDate,
          scheduleByDate: scheduleIndex.get(employee.id),
          punchesByDate: punchIndex.get(employee.id),
        }),
      ),
    };
  }

  private buildRow(params: {
    employee: IAttendanceRosterRow;
    workDates: string[];
    nowByWorkDate: Map<string, number>;
    scheduleByDate?: Map<string, IShiftDayWithPattern[]>;
    punchesByDate?: Map<string, AttendancePunch[]>;
  }): IAttendanceResultRow {
    const {
      employee,
      workDates,
      nowByWorkDate,
      scheduleByDate,
      punchesByDate,
    } = params;

    const days = workDates.map((workDate) =>
      this.evaluateDay({
        workDate,
        nowMinuteOfDay: nowByWorkDate.get(workDate) ?? 0,
        // Info: (20260813 - Julian) 取第一筆即可：`@@unique([accountBookId, employeeId, workDate])` 保證一人一天最多一筆排班
        shiftDay: scheduleByDate?.get(workDate)?.[0],
        punches: punchesByDate?.get(workDate) ?? [],
      }),
    );

    return {
      employeeId: employee.id,
      employeeNo: employee.employeeNo,
      name: employee.name,
      departmentName: employee.department?.name ?? null,
      jobTitle: employee.jobTitle?.title ?? null,
      days,
      summary: summarise(days),
    };
  }

  private evaluateDay(params: {
    workDate: string;
    nowMinuteOfDay: number;
    shiftDay?: IShiftDayWithPattern;
    punches: AttendancePunch[];
  }): IAttendanceDayResult {
    const { workDate, nowMinuteOfDay, shiftDay, punches } = params;

    const shift = shiftDay ? toShiftWindow(shiftDay) : null;
    const schedule = toDaySchedule(shiftDay);

    // Info: (20260813 - Julian) 投影成 IPunchSnapshot，只留判定用得到的欄位——經緯度密文、精度、地點 id 越早丟掉越好，避免被順手帶出回傳值
    const snapshots: IPunchSnapshot[] = punches.map((punch) => ({
      punchType: toPunchType(punch.punchType),
      minuteOfDay: minutesFromWorkDateStart(
        punch.punchedAt,
        workDate,
        this.timeZone,
      ),
    }));

    const evaluation = evaluateAttendanceDay({
      workDate,
      schedule,
      punches: snapshots,
      policy: DEMO_POLICY,
      nowMinuteOfDay,
    });

    return {
      workDate,
      status: evaluation.status,
      phase: resolvePhase(nowMinuteOfDay, shift, DEMO_POLICY),
      dayType: schedule?.dayType ?? null,
      shiftName: shiftDay?.shiftPattern?.name ?? null,
      shiftKind: shift ? deriveShiftPatternKind(shift) : null,
      workedMinutes: evaluation.workedMinutes,
      firstInMinute: evaluation.firstInMinute,
      lastOutMinute: evaluation.lastOutMinute,
      exceptions: evaluation.exceptions,
    };
  }
}

export const attendanceResultService = new AttendanceResultService(
  employeeRepo,
  attendanceScheduleRepo,
  attendancePunchRepo,
);

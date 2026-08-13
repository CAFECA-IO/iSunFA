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
 * Info: (20260813 - Julian) 出勤判定結果（A9）。**即時計算，不讀結果表。**
 *
 * ## 為什麼不落地
 *
 * 判定結果是**排班、打卡、政策、規則版本**這四者的純函數。把它存起來，
 * 系統就同時有兩個真相：算出來的，與存下來的。而它們一定會分岔 ——
 * 補登單核准、排班補排、寬限值調整，任何一件事都會讓存下來的那份過期，
 * 卻沒有任何機制通知它。這與 `ProcessTaskType`／`MovementStage`
 * 不入庫是同一條理由（ADR 019）。
 *
 * 代價是每次查詢都要重算。一個月 × 12 人 = 372 次純函數呼叫與兩次查詢 ——
 * 在 demo 規模下這個代價買到的是「永遠不會有第二種真相」。
 * 規模上去之後正解是**快取**（可隨時丟棄、丟了自己會重建），不是落地
 * （丟不掉，且丟不掉的東西就會被當成真相）。
 *
 * ## 判定的「現在」由呼叫端注入
 *
 * `evaluatedAt` 一路傳到引擎，service 內不呼叫 `new Date()`。
 * 整張矩陣共用同一個時間點 —— 逐列各取一次現在，兩位員工的邊界案例
 * （剛好卡在寬限上的那一分鐘）就可能在同一張表裡得到互相矛盾的顏色。
 */

// Info: (20260813 - Julian) Demo 政策；正式版改讀帳本層級的 `AttendancePolicy`
const DEMO_POLICY: IAttendancePolicySnapshot = {
  lateGraceMinutes: DEMO_LATE_GRACE_MINUTES,
  earlyLeaveGraceMinutes: DEMO_EARLY_LEAVE_GRACE_MINUTES,
  missingClockOutGraceMinutes: DEMO_MISSING_CLOCK_OUT_GRACE_MINUTES,
};

/**
 * Info: (20260813 - Julian) Prisma 回的是**字面量聯集**，`IPunchSnapshot` 要的是
 * TS string enum（名義型別）—— 值域相同但型別不相容，必須明寫轉換。
 * 值域一致由 `hr_enum_mirror.test.ts` 保證，schema 一改動它就會紅。
 */
const toPunchType = (value: string): PunchType => value as PunchType;

/**
 * Info: (20260813 - Julian) 這一天算完了沒。
 *
 * 邊界取「窗迄 + 漏打下班卡寬限」而不是日曆換日：夜間施工班的 8/12
 * 要到 8/13 清晨才結束，用換日判斷會讓夜班那一列每天早八小時變色。
 *
 * 無班別的日子（休假、無排班）退回以整個日曆日為窗 —— 用的是同一組單位
 * （工作日當地 00:00 起算的分鐘數），因此不需要第二條程式路徑。
 */
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

    /**
     * Info: (20260813 - Julian) 指定的員工不在名冊時回**空矩陣**，不是 404。
     *
     * 回 404 等於告訴呼叫者「這個 id 在系統裡不存在」，而回空矩陣兩種情況
     * 長得一樣：id 不存在，或這個人在這段期間還沒到職／已離職。
     * 前者是不該外洩的事實，後者是正當的查詢結果。
     */
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

    /**
     * Info: (20260813 - Julian) 每個工作日的「現在」只算一次，全體員工共用。
     * 逐格重算會呼叫 372 次 `Intl.DateTimeFormat`，而答案完全相同。
     */
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
        /**
         * Info: (20260813 - Julian) 取第一筆即可：`@@unique([accountBookId, employeeId, workDate])`
         * 保證一人一天最多一筆排班。這條約束是「一天兩份班表」這種
         * 最常見的匯入錯誤唯一擋得住的地方。
         */
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

    /**
     * Info: (20260813 - Julian) 投影成 `IPunchSnapshot`：只留下判定用得到的兩個欄位。
     *
     * 經緯度密文、定位精度、地點 id 都在這一步被丟掉，而**丟得越早越好** ——
     * 它們一旦進入回傳值的組裝範圍，就只差一次順手的物件展開會被送出去。
     */
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

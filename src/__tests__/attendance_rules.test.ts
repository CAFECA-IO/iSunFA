import { describe, it, expect } from "@jest/globals";
import {
  ATTENDANCE_ENGINE_VERSION,
  deriveShiftPatternKind,
  evaluateAttendanceDay,
} from "@/lib/attendance_rules";
import {
  AttendanceDayStatus,
  AttendanceExceptionType,
  PunchType,
  ShiftPatternKind,
  WorkDayType,
} from "@/constants/attendance";
import {
  IAttendanceDayInput,
  IAttendancePolicySnapshot,
  IDaySchedule,
  IPunchSnapshot,
  IShiftWindow,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 出勤判定引擎的表格驅動測試。
 *
 * 這支引擎是整個簽到模組唯一「寫完就是正式版」的程式碼（demo 版與正式版
 * 是同一份純函數），因此驗收方式是**窮舉計畫書 §7.2 的判定表**，不是抽樣。
 *
 * 每一個 `it` 對應判定表的一列，順序與表格一致，方便對照。
 * 第 11 條 `SUSPICIOUS_JUMP` 不在此測 —— 它需要跨日的前一筆打卡，
 * 屬於打卡當下的護欄而非當日比對。
 */

// Info: (20260813 - Julian) 分鐘輔助：把 "07:30" 這種讀得懂的寫法轉成當日分鐘數
const at = (hour: number, minute: number): number => hour * 60 + minute;
// Info: (20260813 - Julian) 次日的時刻（夜班用）
const nextDayAt = (hour: number, minute: number): number =>
  1440 + hour * 60 + minute;

/**
 * Info: (20260813 - Julian) 四種班別，與展示資料 §5 完全一致。
 *
 * 三種固定班都刻意留 30 分鐘餘裕（窗長 − 休息 − 應工作），
 * 因此小幅遲到只觸發 LATE，大幅遲到才會連帶觸發 INSUFFICIENT_HOURS ——
 * 那個梯度正是「一天可以有多個異常」的測試材料。
 */
const SITE_DAY: IShiftWindow = {
  windowStartMinute: at(7, 30),
  windowEndMinute: at(17, 0),
  coreStartMinute: at(7, 30),
  coreEndMinute: at(17, 0),
  requiredWorkMinutes: 480,
  breakMinutes: 60,
};

const SITE_NIGHT: IShiftWindow = {
  windowStartMinute: at(20, 0),
  windowEndMinute: nextDayAt(5, 0),
  coreStartMinute: at(20, 0),
  coreEndMinute: nextDayAt(5, 0),
  requiredWorkMinutes: 450,
  breakMinutes: 60,
};

const ENG_FLEX: IShiftWindow = {
  windowStartMinute: at(7, 0),
  windowEndMinute: at(20, 0),
  coreStartMinute: at(10, 0),
  coreEndMinute: at(16, 0),
  requiredWorkMinutes: 480,
  breakMinutes: 60,
};

const OFFICE_98: IShiftWindow = {
  windowStartMinute: at(9, 0),
  windowEndMinute: at(18, 30),
  coreStartMinute: at(9, 0),
  coreEndMinute: at(18, 30),
  requiredWorkMinutes: 480,
  breakMinutes: 60,
};

const POLICY: IAttendancePolicySnapshot = {
  lateGraceMinutes: 5,
  earlyLeaveGraceMinutes: 5,
  missingClockOutGraceMinutes: 3,
};

const workDay = (shift: IShiftWindow): IDaySchedule => ({
  dayType: WorkDayType.WORK,
  shift,
});

const clockIn = (minute: number): IPunchSnapshot => ({
  punchType: PunchType.CLOCK_IN,
  minuteOfDay: minute,
});

const clockOut = (minute: number): IPunchSnapshot => ({
  punchType: PunchType.CLOCK_OUT,
  minuteOfDay: minute,
});

/**
 * Info: (20260813 - Julian) 預設「現在」為次日中午，代表這一天早已過完。
 * 需要測「當日尚未結束」的案例再個別覆寫。
 */
const AFTER_THE_DAY = nextDayAt(12, 0);

const evaluate = (
  overrides: Partial<IAttendanceDayInput>,
): ReturnType<typeof evaluateAttendanceDay> =>
  evaluateAttendanceDay({
    workDate: "2026-08-12",
    schedule: workDay(SITE_DAY),
    punches: [],
    policy: POLICY,
    nowMinuteOfDay: AFTER_THE_DAY,
    ...overrides,
  });

// Info: (20260813 - Julian) 只比對異常的型別與分鐘數，不在意順序
const exceptionsOf = (
  result: ReturnType<typeof evaluateAttendanceDay>,
): Array<[AttendanceExceptionType, number]> =>
  result.exceptions
    .map((item): [AttendanceExceptionType, number] => [item.type, item.minutes])
    .sort((left, right) => left[0].localeCompare(right[0]));

describe("deriveShiftPatternKind", () => {
  it("should read a shift whose window equals its core as a fixed shift", () => {
    expect(deriveShiftPatternKind(SITE_DAY)).toBe(ShiftPatternKind.FIXED);
    expect(deriveShiftPatternKind(OFFICE_98)).toBe(ShiftPatternKind.FIXED);
  });

  it("should read a shift with a wider window as a flexible shift", () => {
    expect(deriveShiftPatternKind(ENG_FLEX)).toBe(ShiftPatternKind.FLEXIBLE);
  });

  it("should read an overnight shift as fixed", () => {
    expect(deriveShiftPatternKind(SITE_NIGHT)).toBe(ShiftPatternKind.FIXED);
  });
});

describe("evaluateAttendanceDay / 判定表", () => {
  // Info: (20260813 - Julian) #1 非上班日且無打卡
  it("should report an off day when the day is not a work day and nobody punched", () => {
    const result = evaluate({
      schedule: { dayType: WorkDayType.REST_DAY },
      punches: [],
    });

    expect(result.status).toBe(AttendanceDayStatus.OFF_DAY);
    expect(result.exceptions).toHaveLength(0);
  });

  /**
   * Info: (20260813 - Julian) #2 非上班日但有打卡。
   * 假日到工是**加班事實**不是異常 —— 標紅會讓真正的異常被淹沒。
   */
  it("should not treat working on a rest day as an exception", () => {
    const result = evaluate({
      schedule: { dayType: WorkDayType.REST_DAY },
      punches: [clockIn(at(8, 0)), clockOut(at(17, 0))],
    });

    expect(result.status).toBe(AttendanceDayStatus.OFF_DAY);
    expect(result.exceptions).toHaveLength(0);
    expect(result.firstInMinute).toBe(at(8, 0));
  });

  it("should treat a public holiday the same way as a rest day", () => {
    const result = evaluate({
      schedule: { dayType: WorkDayType.HOLIDAY },
      punches: [clockIn(at(8, 0)), clockOut(at(17, 0))],
    });

    expect(result.status).toBe(AttendanceDayStatus.OFF_DAY);
    expect(result.exceptions).toHaveLength(0);
  });

  /**
   * Info: (20260813 - Julian) #3 完全沒有排班紀錄。
   * **不判曠職** —— 沒有班表就沒有比較基準，判曠職是無中生有。
   */
  it("should report no schedule instead of absence when the day was never scheduled", () => {
    const result = evaluate({ schedule: null, punches: [] });

    expect(result.status).toBe(AttendanceDayStatus.NO_SCHEDULE);
    expect(result.exceptions).toHaveLength(0);
  });

  it("should still report no schedule even if the employee punched", () => {
    const result = evaluate({
      schedule: null,
      punches: [clockIn(at(9, 0)), clockOut(at(18, 0))],
    });

    expect(result.status).toBe(AttendanceDayStatus.NO_SCHEDULE);
    expect(result.exceptions).toHaveLength(0);
  });

  // Info: (20260813 - Julian) #4 應出勤、完全無打卡、窗迄已過
  it("should report absence when a scheduled day ended with no punch at all", () => {
    const result = evaluate({ punches: [] });

    expect(result.status).toBe(AttendanceDayStatus.EXCEPTION);
    expect(exceptionsOf(result)).toEqual([[AttendanceExceptionType.ABSENT, 0]]);
  });

  /**
   * Info: (20260813 - Julian) #5 應出勤、無打卡，但當日尚未結束。
   * 早上十點不能判人曠職 —— 判定的前提是「這一天已經過完」。
   */
  it("should not report absence while the working window is still open", () => {
    const result = evaluate({ punches: [], nowMinuteOfDay: at(10, 0) });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
    expect(result.exceptions).toHaveLength(0);
  });

  // Info: (20260813 - Julian) #6 有下班卡卻沒有上班卡
  it("should report a missing clock-in when only a clock-out exists", () => {
    const result = evaluate({ punches: [clockOut(at(17, 2))] });

    expect(result.status).toBe(AttendanceDayStatus.EXCEPTION);
    expect(exceptionsOf(result)).toEqual([
      [AttendanceExceptionType.MISSING_CLOCK_IN, 0],
    ]);
    expect(result.workedMinutes).toBe(0);
  });

  // Info: (20260813 - Julian) #7 有上班卡沒有下班卡，且已過窗迄加寬限
  it("should report a missing clock-out once the grace period after the window has passed", () => {
    const result = evaluate({ punches: [clockIn(at(7, 26))] });

    expect(result.status).toBe(AttendanceDayStatus.EXCEPTION);
    expect(exceptionsOf(result)).toEqual([
      [AttendanceExceptionType.MISSING_CLOCK_OUT, 0],
    ]);
  });

  // Info: (20260813 - Julian) #7 的另一半：還在班中不算漏打卡
  it("should not report a missing clock-out while the employee is still on shift", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 26))],
      nowMinuteOfDay: at(14, 0),
    });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
    expect(result.exceptions).toHaveLength(0);
  });

  // Info: (20260813 - Julian) #8 遲到，且幅度在餘裕內，因此只有一筆異常
  it("should report lateness measured from the core start", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 50)), clockOut(at(17, 5))],
    });

    expect(result.status).toBe(AttendanceDayStatus.EXCEPTION);
    expect(exceptionsOf(result)).toEqual([[AttendanceExceptionType.LATE, 20]]);
  });

  // Info: (20260813 - Julian) #9 早退，同樣在餘裕內
  it("should report an early leave measured from the core end", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 25)), clockOut(at(16, 40))],
    });

    expect(result.status).toBe(AttendanceDayStatus.EXCEPTION);
    expect(exceptionsOf(result)).toEqual([
      [AttendanceExceptionType.EARLY_LEAVE, 20],
    ]);
  });

  /**
   * Info: (20260813 - Julian) #10 工時不足 —— 彈性工時真正要管的東西。
   * 核心 10–16 的人 09:30 進、17:00 出：不遲到、不早退，但總時數不夠。
   */
  it("should report insufficient hours for a flexible shift that met the core window", () => {
    const result = evaluate({
      schedule: workDay(ENG_FLEX),
      punches: [clockIn(at(9, 30)), clockOut(at(17, 0))],
    });

    expect(result.status).toBe(AttendanceDayStatus.EXCEPTION);
    expect(result.workedMinutes).toBe(390);
    expect(exceptionsOf(result)).toEqual([
      [AttendanceExceptionType.INSUFFICIENT_HOURS, 90],
    ]);
  });

  /**
   * Info: (20260813 - Julian) #8 + #10：遲到幅度超過餘裕，兩筆異常同時成立。
   *
   * 這正是異常被設計成清單而不是單一欄位的理由 ——
   * 壓成一個值就得回答「哪個異常比較重要」，而那個問題沒有答案。
   */
  it("should report both lateness and insufficient hours when the delay exceeds the slack", () => {
    const result = evaluate({
      punches: [clockIn(at(8, 15)), clockOut(at(17, 5))],
    });

    expect(result.status).toBe(AttendanceDayStatus.EXCEPTION);
    expect(result.workedMinutes).toBe(465);
    expect(exceptionsOf(result)).toEqual([
      [AttendanceExceptionType.INSUFFICIENT_HOURS, 15],
      [AttendanceExceptionType.LATE, 45],
    ]);
  });

  // Info: (20260813 - Julian) #12 正常
  it("should report a normal day when nothing is wrong", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 25)), clockOut(at(17, 5))],
    });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
    expect(result.exceptions).toHaveLength(0);
    expect(result.workedMinutes).toBe(510);
  });

  it("should stamp the engine version on every result", () => {
    expect(evaluate({}).engineVersion).toBe(ATTENDANCE_ENGINE_VERSION);
  });
});

/**
 * Info: (20260813 - Julian) 跨日夜班。
 *
 * 20:00 進、次日 05:00 出，窗迄以 1740（= 1440 + 300）表示。
 * 跨日不需要任何特殊欄位或旗標 —— 「>= 1440 即次日」這個約定就是全部的機制。
 */
describe("evaluateAttendanceDay / 跨日夜班", () => {
  it("should evaluate an overnight shift without any special casing", () => {
    const result = evaluate({
      schedule: workDay(SITE_NIGHT),
      punches: [clockIn(at(20, 2)), clockOut(nextDayAt(5, 3))],
      nowMinuteOfDay: nextDayAt(12, 0),
    });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
    expect(result.workedMinutes).toBe(478);
  });

  it("should report lateness on an overnight shift the same way", () => {
    const result = evaluate({
      schedule: workDay(SITE_NIGHT),
      punches: [clockIn(at(20, 20)), clockOut(nextDayAt(5, 0))],
      nowMinuteOfDay: nextDayAt(12, 0),
    });

    expect(exceptionsOf(result)).toEqual([[AttendanceExceptionType.LATE, 20]]);
  });

  /**
   * Info: (20260813 - Julian) 夜班未打下班卡 —— 展示資料裡讓某人在演示當天
   * 呈現 STALE 的那一筆。判定側對應的是 MISSING_CLOCK_OUT。
   */
  it("should report a missing clock-out for an overnight shift the morning after", () => {
    const result = evaluate({
      schedule: workDay(SITE_NIGHT),
      punches: [clockIn(at(20, 5))],
      nowMinuteOfDay: nextDayAt(14, 0),
    });

    expect(exceptionsOf(result)).toEqual([
      [AttendanceExceptionType.MISSING_CLOCK_OUT, 0],
    ]);
  });
});

/**
 * Info: (20260813 - Julian) P4 的核心主張：**同一天、同一分鐘、相反結論**。
 *
 * 兩位同仁都在 09:47 打卡，一位遲到、一位正常 —— 而判定引擎裡沒有任何一行
 * 程式碼在區分這兩種制度。差別完全來自 ShiftPattern 那六個欄位的值。
 *
 * 這組測試同時是展示資料 §8 第 7、8 兩筆的驗算：
 * 演示當天畫面上會出現什麼數字，由這裡決定。
 */
describe("evaluateAttendanceDay / 固定班與彈性班的對照", () => {
  const arriveAt = at(9, 47);

  it("should flag 09:47 as late on a fixed shift that starts at 09:00", () => {
    const result = evaluate({
      schedule: workDay(OFFICE_98),
      punches: [clockIn(arriveAt), clockOut(at(18, 30))],
    });

    expect(result.status).toBe(AttendanceDayStatus.EXCEPTION);
    expect(exceptionsOf(result)).toEqual([
      [AttendanceExceptionType.INSUFFICIENT_HOURS, 17],
      [AttendanceExceptionType.LATE, 47],
    ]);
  });

  it("should accept the very same 09:47 on a flexible shift with a 10:00 core", () => {
    const result = evaluate({
      schedule: workDay(ENG_FLEX),
      punches: [clockIn(arriveAt), clockOut(at(18, 50))],
    });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
    expect(result.exceptions).toHaveLength(0);
    expect(result.workedMinutes).toBe(483);
  });

  /**
   * Info: (20260813 - Julian) 反向的對照：早退的判定也只看核心時間。
   * 固定班 18:10 走是早退（核心到 18:30），彈性班 18:10 走完全正常（核心到 16:00）。
   */
  it("should apply the same early-leave rule to both shift kinds", () => {
    const fixed = evaluate({
      schedule: workDay(OFFICE_98),
      punches: [clockIn(at(9, 0)), clockOut(at(18, 10))],
    });
    const flexible = evaluate({
      schedule: workDay(ENG_FLEX),
      punches: [clockIn(at(8, 30)), clockOut(at(18, 10))],
    });

    expect(exceptionsOf(fixed)).toEqual([
      [AttendanceExceptionType.EARLY_LEAVE, 20],
    ]);
    expect(flexible.status).toBe(AttendanceDayStatus.NORMAL);
  });
});

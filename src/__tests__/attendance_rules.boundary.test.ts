import { describe, it, expect } from "@jest/globals";
import {
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
  IPunchSnapshot,
  IShiftWindow,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 判定引擎的邊界值測試。
 *
 * 主測試（`attendance_rules.test.ts`）證明每一條判定規則會觸發；
 * 這一支證明它們**恰好**在該觸發的那一分鐘觸發。
 *
 * 出勤系統的爭議幾乎都發生在邊界上：「我明明準時到」「我只早走一分鐘」。
 * 每一條規則的 `>` 與 `>=` 之差，就是一名員工被記一筆異常與否的差別，
 * 因此每個門檻都測三個點：**前一分鐘、剛好、後一分鐘**。
 */

const at = (hour: number, minute: number): number => hour * 60 + minute;
const nextDayAt = (hour: number, minute: number): number =>
  1440 + hour * 60 + minute;

// Info: (20260813 - Julian) 固定班：窗＝核心 07:30–17:00，餘裕 30 分
const SITE_DAY: IShiftWindow = {
  windowStartMinute: at(7, 30),
  windowEndMinute: at(17, 0),
  coreStartMinute: at(7, 30),
  coreEndMinute: at(17, 0),
  requiredWorkMinutes: 480,
  breakMinutes: 60,
};

// Info: (20260813 - Julian) 彈性班：窗 07:00–20:00、核心 10:00–16:00，餘裕 240 分
const ENG_FLEX: IShiftWindow = {
  windowStartMinute: at(7, 0),
  windowEndMinute: at(20, 0),
  coreStartMinute: at(10, 0),
  coreEndMinute: at(16, 0),
  requiredWorkMinutes: 480,
  breakMinutes: 60,
};

const POLICY: IAttendancePolicySnapshot = {
  lateGraceMinutes: 5,
  earlyLeaveGraceMinutes: 5,
  missingClockOutGraceMinutes: 3,
};

const clockIn = (minute: number): IPunchSnapshot => ({
  punchType: PunchType.CLOCK_IN,
  minuteOfDay: minute,
});

const clockOut = (minute: number): IPunchSnapshot => ({
  punchType: PunchType.CLOCK_OUT,
  minuteOfDay: minute,
});

const AFTER_THE_DAY = nextDayAt(12, 0);

const evaluate = (
  overrides: Partial<IAttendanceDayInput>,
): ReturnType<typeof evaluateAttendanceDay> =>
  evaluateAttendanceDay({
    workDate: "2026-08-12",
    schedule: { dayType: WorkDayType.WORK, shift: SITE_DAY },
    punches: [],
    policy: POLICY,
    nowMinuteOfDay: AFTER_THE_DAY,
    ...overrides,
  });

const typesOf = (
  result: ReturnType<typeof evaluateAttendanceDay>,
): AttendanceExceptionType[] => result.exceptions.map((item) => item.type);

describe("遲到門檻：coreStart + lateGraceMinutes", () => {
  // Info: (20260813 - Julian) 07:30 準時，出勤 09:40 分鐘足夠
  it("should not be late when arriving exactly at the core start", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 30)), clockOut(at(17, 0))],
    });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });

  it("should not be late at exactly the last minute of the grace period", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 35)), clockOut(at(17, 0))],
    });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });

  /**
   * Info: (20260813 - Julian) 超出寬限一分鐘即遲到，而分鐘數是從**核心時間**算起
   * 而不是從寬限的邊緣算起 —— 寬限只決定「觸不觸發」，不折抵已遲到的時間。
   */
  it("should be late one minute past the grace period, counted from the core start", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 36)), clockOut(at(17, 0))],
    });

    expect(result.exceptions).toEqual([
      { type: AttendanceExceptionType.LATE, minutes: 6 },
    ]);
  });
});

describe("早退門檻：coreEnd − earlyLeaveGraceMinutes", () => {
  it("should not be an early leave when leaving exactly at the core end", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 30)), clockOut(at(17, 0))],
    });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });

  it("should not be an early leave at exactly the edge of the grace period", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 30)), clockOut(at(16, 55))],
    });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });

  it("should be an early leave one minute inside the grace period, counted from the core end", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 30)), clockOut(at(16, 54))],
    });

    expect(result.exceptions).toEqual([
      { type: AttendanceExceptionType.EARLY_LEAVE, minutes: 6 },
    ]);
  });
});

describe("工時門檻：requiredWorkMinutes", () => {
  /**
   * Info: (20260813 - Julian) 用彈性班測工時邊界。
   *
   * 固定班的窗＝核心，工時剛好踩線時必然同時碰到早退門檻，
   * 兩條規則會攪在一起而測不出想測的那一條。
   */
  it("should not report insufficient hours when the worked minutes exactly meet the requirement", () => {
    const result = evaluate({
      schedule: { dayType: WorkDayType.WORK, shift: ENG_FLEX },
      punches: [clockIn(at(10, 0)), clockOut(at(19, 0))],
    });

    expect(result.workedMinutes).toBe(480);
    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });

  it("should report exactly one minute short when the employee leaves a minute early", () => {
    const result = evaluate({
      schedule: { dayType: WorkDayType.WORK, shift: ENG_FLEX },
      punches: [clockIn(at(10, 0)), clockOut(at(18, 59))],
    });

    expect(result.workedMinutes).toBe(479);
    expect(result.exceptions).toEqual([
      { type: AttendanceExceptionType.INSUFFICIENT_HOURS, minutes: 1 },
    ]);
  });

  /**
   * Info: (20260813 - Julian) 工時不可能為負。
   * 進出間隔短於休息時間時取 0，不是一個負數。
   */
  it("should never produce negative worked minutes", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 30)), clockOut(at(8, 0))],
    });

    expect(result.workedMinutes).toBe(0);
  });
});

describe("彈性窗的夾取（clamp）", () => {
  /**
   * Info: (20260813 - Julian) 早到不多算工時。
   * 06:40 到班的固定班（窗起 07:30）從 07:30 起算，也不因早到被判成任何異常。
   */
  it("should not credit work done before the window opens", () => {
    const result = evaluate({
      punches: [clockIn(at(6, 40)), clockOut(at(17, 0))],
    });

    expect(result.workedMinutes).toBe(510);
    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });

  // Info: (20260813 - Julian) 晚走同理：窗迄之後的時間不認列
  it("should not credit work done after the window closes", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 30)), clockOut(at(18, 20))],
    });

    expect(result.workedMinutes).toBe(510);
    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });
});

describe("曠職門檻：nowMinuteOfDay > windowEnd", () => {
  it("should not report absence at exactly the closing minute of the window", () => {
    const result = evaluate({ punches: [], nowMinuteOfDay: at(17, 0) });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });

  it("should report absence one minute after the window closes", () => {
    const result = evaluate({ punches: [], nowMinuteOfDay: at(17, 1) });

    expect(typesOf(result)).toEqual([AttendanceExceptionType.ABSENT]);
  });
});

describe("漏打下班卡門檻：windowEnd + missingClockOutGraceMinutes", () => {
  it("should not report a missing clock-out at exactly the edge of the grace period", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 30))],
      nowMinuteOfDay: at(17, 3),
    });

    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });

  it("should report a missing clock-out one minute past the grace period", () => {
    const result = evaluate({
      punches: [clockIn(at(7, 30))],
      nowMinuteOfDay: at(17, 4),
    });

    expect(typesOf(result)).toEqual([
      AttendanceExceptionType.MISSING_CLOCK_OUT,
    ]);
  });
});

describe("多筆打卡的收斂", () => {
  /**
   * Info: (20260813 - Julian) 一天多次進出（外出洽公、誤觸多打）以
   * 「最早 IN / 最晚 OUT」收斂 —— demo 版不做分段計時（母計畫 §7.4 的已知簡化）。
   */
  it("should take the earliest clock-in and the latest clock-out", () => {
    const result = evaluate({
      punches: [
        clockIn(at(8, 0)),
        clockOut(at(12, 0)),
        clockIn(at(7, 30)),
        clockOut(at(17, 0)),
      ],
    });

    expect(result.firstInMinute).toBe(at(7, 30));
    expect(result.lastOutMinute).toBe(at(17, 0));
    expect(result.status).toBe(AttendanceDayStatus.NORMAL);
  });

  it("should not depend on the order the punches arrive in", () => {
    const ordered = evaluate({
      punches: [clockIn(at(7, 30)), clockOut(at(17, 0))],
    });
    const shuffled = evaluate({
      punches: [clockOut(at(17, 0)), clockIn(at(7, 30))],
    });

    expect(shuffled).toEqual(ordered);
  });
});

describe("deriveShiftPatternKind 的邊界", () => {
  /**
   * Info: (20260813 - Julian) 只要窗與核心有任一端不同，就是彈性班。
   * 「窗＝核心」是固定班的**定義**，不是近似 —— 差一分鐘就不是。
   */
  it("should call a shift flexible when only its start differs", () => {
    const shift: IShiftWindow = {
      ...SITE_DAY,
      windowStartMinute: SITE_DAY.coreStartMinute - 1,
    };

    expect(deriveShiftPatternKind(shift)).toBe(ShiftPatternKind.FLEXIBLE);
  });

  it("should call a shift flexible when only its end differs", () => {
    const shift: IShiftWindow = {
      ...SITE_DAY,
      windowEndMinute: SITE_DAY.coreEndMinute + 1,
    };

    expect(deriveShiftPatternKind(shift)).toBe(ShiftPatternKind.FLEXIBLE);
  });
});

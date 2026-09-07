import { describe, it, expect } from "@jest/globals";
import {
  AttendanceCellTone,
  AttendanceDayPhase,
  AttendanceDayStatus,
  AttendanceExceptionType,
  ATTENDANCE_FILTER_EXCEPTION_ONLY,
  WorkDayType,
} from "@/constants/attendance";
import { HR_FILTER_ALL } from "@/constants/hr_management";
import {
  ATTENDANCE_SUMMARY_COLUMNS,
  countExceptionDays,
  departmentOptionsOf,
  dominantException,
  filterResultRows,
  hasHiddenExceptions,
  isoMonthOf,
  monthRange,
  resolveCellTone,
  shiftIsoMonth,
} from "@/lib/utils/attendance_result_view";
import {
  formatMinuteOfDay,
  dayOfIsoDate,
  toHourMinute,
} from "@/lib/utils/attendance_format";
import {
  IAttendanceDayResult,
  IAttendanceExceptionItem,
  IAttendanceResultRow,
  IAttendanceResultSummary,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 出勤總覽的顯示邏輯。
 *
 * 這支測試守的是一批**取捨**而不是計算：哪一種異常代表這一天、
 * 什麼時候該留白、統計欄怎麼合併。它們都是會被質疑的決定，
 * 而被質疑時能拿出來的東西應該是一條命名清楚的測試，不是一段記憶。
 */

const day = (
  overrides: Partial<IAttendanceDayResult>,
): IAttendanceDayResult => ({
  workDate: "2026-08-12",
  status: AttendanceDayStatus.NORMAL,
  phase: AttendanceDayPhase.CONCLUDED,
  dayType: WorkDayType.WORK,
  shiftName: "本部行政班",
  shiftKind: null,
  workedMinutes: 480,
  firstInMinute: 540,
  lastOutMinute: 1080,
  exceptions: [],
  ...overrides,
});

const exception = (
  type: AttendanceExceptionType,
  minutes = 0,
): IAttendanceExceptionItem => ({ type, minutes });

const summary = (
  overrides: Partial<IAttendanceResultSummary>,
): IAttendanceResultSummary => ({
  scheduledWorkDays: 20,
  normalDays: 20,
  exceptionDays: 0,
  pendingDays: 0,
  offDays: 8,
  noScheduleDays: 3,
  workedMinutes: 9600,
  exceptions: [],
  ...overrides,
});

const row = (
  overrides: Partial<IAttendanceResultRow>,
): IAttendanceResultRow => ({
  employeeId: "emp-2",
  employeeNo: "EMP002",
  name: "王小明",
  departmentName: "工程處本部",
  jobTitle: "工務行政",
  days: [],
  summary: summary({}),
  ...overrides,
});

describe("attendance_result_view", () => {
  describe("一格一個顏色，所以必須先選出代表這一天的異常", () => {
    it("遲到與工時不足並存時由遲到代表 —— 遲到是原因，工時不足是結果", () => {
      const target = day({
        status: AttendanceDayStatus.EXCEPTION,
        exceptions: [
          exception(AttendanceExceptionType.INSUFFICIENT_HOURS, 120),
          exception(AttendanceExceptionType.LATE, 47),
        ],
      });

      expect(dominantException(target)?.type).toBe(
        AttendanceExceptionType.LATE,
      );
      expect(resolveCellTone(target)).toBe(AttendanceCellTone.LATE);
      // Info: (20260813 - Julian) 顏色藏掉了工時不足，格子必須自己說出「還有」
      expect(hasHiddenExceptions(target)).toBe(true);
    });

    it("曠職優先於一切 —— 對出工查核而言「沒來」是最大的那個問題", () => {
      const target = day({
        status: AttendanceDayStatus.EXCEPTION,
        exceptions: [
          exception(AttendanceExceptionType.LATE, 47),
          exception(AttendanceExceptionType.ABSENT),
        ],
      });

      expect(resolveCellTone(target)).toBe(AttendanceCellTone.ABSENT);
    });

    it("兩種漏打卡共用同一個顏色，哪一端留給明細交代", () => {
      const missingIn = day({
        status: AttendanceDayStatus.EXCEPTION,
        exceptions: [exception(AttendanceExceptionType.MISSING_CLOCK_IN)],
      });
      const missingOut = day({
        status: AttendanceDayStatus.EXCEPTION,
        exceptions: [exception(AttendanceExceptionType.MISSING_CLOCK_OUT)],
      });

      expect(resolveCellTone(missingIn)).toBe(AttendanceCellTone.MISSING_PUNCH);
      expect(resolveCellTone(missingOut)).toBe(
        AttendanceCellTone.MISSING_PUNCH,
      );
    });

    it("只有一種異常時不標記「還有」", () => {
      expect(
        hasHiddenExceptions(
          day({
            status: AttendanceDayStatus.EXCEPTION,
            exceptions: [exception(AttendanceExceptionType.LATE, 47)],
          }),
        ),
      ).toBe(false);
    });
  });

  describe("什麼時候該留白", () => {
    it("尚未過完的上班日不上綠色，即使 status 是 NORMAL", () => {
      /**
       * Info: (20260813 - Julian) 這一條是整個 phase 機制存在的理由。
       * 少了它，下個月每一格都會是「正常出勤」的綠色。
       */
      expect(resolveCellTone(day({ phase: AttendanceDayPhase.UPCOMING }))).toBe(
        AttendanceCellTone.PENDING,
      );
      expect(
        resolveCellTone(day({ phase: AttendanceDayPhase.IN_PROGRESS })),
      ).toBe(AttendanceCellTone.PENDING);
      expect(
        resolveCellTone(day({ phase: AttendanceDayPhase.CONCLUDED })),
      ).toBe(AttendanceCellTone.NORMAL);
    });

    it("進行中的日子若異常已經成立，照常上色", () => {
      const target = day({
        status: AttendanceDayStatus.EXCEPTION,
        phase: AttendanceDayPhase.IN_PROGRESS,
        exceptions: [exception(AttendanceExceptionType.EARLY_LEAVE, 240)],
      });

      // Info: (20260813 - Julian) 中午就打了下班卡，那是已經發生的事實，不必等當天結束
      expect(resolveCellTone(target)).toBe(AttendanceCellTone.EARLY_LEAVE);
    });

    it("休假與無排班分成兩種顏色 —— 一個是免除義務，一個是沒有比較基準", () => {
      expect(
        resolveCellTone(
          day({
            status: AttendanceDayStatus.OFF_DAY,
            dayType: WorkDayType.REGULAR_OFF,
            shiftName: null,
          }),
        ),
      ).toBe(AttendanceCellTone.OFF_DAY);

      expect(
        resolveCellTone(
          day({
            status: AttendanceDayStatus.NO_SCHEDULE,
            dayType: null,
            shiftName: null,
          }),
        ),
      ).toBe(AttendanceCellTone.NO_SCHEDULE);
    });
  });

  describe("統計欄", () => {
    it("上下班漏打卡合併成一欄", () => {
      const target = summary({
        exceptions: [
          {
            type: AttendanceExceptionType.MISSING_CLOCK_IN,
            days: 1,
            minutes: 0,
          },
          {
            type: AttendanceExceptionType.MISSING_CLOCK_OUT,
            days: 2,
            minutes: 0,
          },
        ],
      });

      const column = ATTENDANCE_SUMMARY_COLUMNS.find(
        (item) => item.key === "missing_punch",
      );
      expect(countExceptionDays(target, column?.types ?? [])).toBe(3);
    });

    it("沒有出現的型別算 0，但沒有實作的規則連欄位都不給", () => {
      expect(
        countExceptionDays(summary({}), [AttendanceExceptionType.LATE]),
      ).toBe(0);

      /**
       * Info: (20260813 - Julian) `SUSPICIOUS_JUMP`（G5）本期未實作。
       * 開一欄填 0 等於在報表上宣稱「查過了、沒有」，而系統根本沒查。
       */
      const types = ATTENDANCE_SUMMARY_COLUMNS.flatMap((item) => item.types);
      expect(types).not.toContain(AttendanceExceptionType.SUSPICIOUS_JUMP);
    });
  });

  describe("篩選", () => {
    const rows = [
      row({
        employeeId: "emp-2",
        employeeNo: "EMP002",
        name: "王小明",
        departmentName: "工程處本部",
        summary: summary({
          exceptionDays: 1,
          exceptions: [
            { type: AttendanceExceptionType.LATE, days: 1, minutes: 47 },
          ],
        }),
      }),
      row({
        employeeId: "emp-5",
        employeeNo: "EMP005",
        name: "張文彬",
        departmentName: "第一工務所",
        summary: summary({
          exceptionDays: 1,
          exceptions: [
            { type: AttendanceExceptionType.ABSENT, days: 1, minutes: 0 },
          ],
        }),
      }),
      row({
        employeeId: "emp-9",
        employeeNo: "EMP009",
        name: "周欣怡",
        departmentName: "第一工務所",
        summary: summary({}),
      }),
    ];

    const allPass = {
      keyword: "",
      departmentName: HR_FILTER_ALL,
      exception: HR_FILTER_ALL,
    };

    it("預設不篩掉任何人", () => {
      expect(filterResultRows(rows, allPass)).toHaveLength(3);
    });

    it("工號與姓名都吃關鍵字，且不分大小寫", () => {
      expect(
        filterResultRows(rows, { ...allPass, keyword: "emp005" }),
      ).toHaveLength(1);
      expect(
        filterResultRows(rows, { ...allPass, keyword: "周欣" })[0].employeeNo,
      ).toBe("EMP009");
    });

    it("僅顯示異常會濾掉整月無異常者", () => {
      const filtered = filterResultRows(rows, {
        ...allPass,
        exception: ATTENDANCE_FILTER_EXCEPTION_ONLY,
      });
      expect(filtered.map((item) => item.employeeNo)).toEqual([
        "EMP002",
        "EMP005",
      ]);
    });

    it("指定異常型別只留有該型別的人", () => {
      const filtered = filterResultRows(rows, {
        ...allPass,
        exception: AttendanceExceptionType.ABSENT,
      });
      expect(filtered.map((item) => item.employeeNo)).toEqual(["EMP005"]);
    });

    it("部門與關鍵字是 and 不是 or", () => {
      expect(
        filterResultRows(rows, {
          ...allPass,
          keyword: "王",
          departmentName: "第一工務所",
        }),
      ).toEqual([]);
    });

    it("部門選項取自資料本身，不預設一份清單", () => {
      expect(departmentOptionsOf(rows)).toEqual(["工程處本部", "第一工務所"]);
    });
  });

  describe("月份與格式", () => {
    it("月份範圍含閏年與大小月", () => {
      expect(monthRange("2026-08")).toEqual({
        from: "2026-08-01",
        to: "2026-08-31",
      });
      expect(monthRange("2026-02")).toEqual({
        from: "2026-02-01",
        to: "2026-02-28",
      });
      // Info: (20260813 - Julian) 2028 是閏年
      expect(monthRange("2028-02").to).toBe("2028-02-29");
    });

    it("月份前後移動會跨年", () => {
      expect(shiftIsoMonth("2026-01", -1)).toBe("2025-12");
      expect(shiftIsoMonth("2026-12", 1)).toBe("2027-01");
      expect(shiftIsoMonth("2026-08", 0)).toBe("2026-08");
    });

    it("跨夜班的下班時刻標成次日，而不是印成今天早上", () => {
      expect(formatMinuteOfDay(1743, "次日")).toBe("次日 05:03");
      expect(formatMinuteOfDay(587, "次日")).toBe("09:47");
      expect(formatMinuteOfDay(null, "次日")).toBe("—");
    });

    it("工時分鐘拆成時與分，讓呼叫端用自己的量詞組句", () => {
      expect(toHourMinute(493)).toEqual({ hours: 8, minutes: 13 });
      expect(toHourMinute(0)).toEqual({ hours: 0, minutes: 0 });
    });

    it("日曆日字串直接取日與月，不建 Date", () => {
      expect(dayOfIsoDate("2026-08-09")).toBe(9);
      expect(isoMonthOf("2026-08-09")).toBe("2026-08");
    });
  });
});

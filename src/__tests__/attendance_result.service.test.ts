import { describe, it, expect } from "@jest/globals";
import { AttendancePunch, EmployeeShiftDay, ShiftPattern } from "@/generated";
import {
  AttendanceDayPhase,
  AttendanceDayStatus,
  AttendanceExceptionType,
  PunchType,
  ShiftPatternKind,
  WorkDayType,
} from "@/constants/attendance";
import { AttendanceResultService } from "@/services/attendance_result.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  IAttendanceRosterRow,
  IEmployeeRepository,
} from "@/repositories/employee.repo";
import {
  IAttendanceScheduleRepository,
  IShiftDayWithPattern,
} from "@/repositories/attendance_schedule.repo";
import { IAttendancePunchRepository } from "@/repositories/attendance_punch.repo";

/**
 * Info: (20260813 - Julian) 判定矩陣（A9）。
 *
 * repository 全部以手寫假物件注入，因此不碰資料庫；**引擎走真的**
 * `evaluateAttendanceDay` —— 這支測試要驗的正是「service 有沒有把正確的
 * 輸入餵給引擎」，換成假引擎就只剩下驗自己的假設。
 *
 * 「現在」由參數注入（`evaluatedAt`），所以不需要假時鐘，
 * 而且每一條測試都能挑一個讓邊界剛好落在有意義位置的時刻。
 */

const ACCOUNT_BOOK_ID = "demo-book-public-works";

// Info: (20260813 - Julian) 本部行政班：窗＝核心，09:00–18:00，故 kind 應衍生為 FIXED
const OFFICE = {
  id: "shift-office",
  code: "OFFICE",
  name: "本部行政班",
  windowStartMinute: 540,
  windowEndMinute: 1080,
  coreStartMinute: 540,
  coreEndMinute: 1080,
  requiredWorkMinutes: 400,
  breakMinutes: 60,
} as ShiftPattern;

// Info: (20260813 - Julian) 夜間施工班：20:00 → 次日 05:00，窗迄 1740 已跨過日曆日
const NIGHT = {
  id: "shift-night",
  code: "SITE-NIGHT",
  name: "夜間施工班",
  windowStartMinute: 1200,
  windowEndMinute: 1740,
  coreStartMinute: 1200,
  coreEndMinute: 1740,
  requiredWorkMinutes: 420,
  breakMinutes: 60,
} as ShiftPattern;

const rosterRow = (
  id: string,
  employeeNo: string,
  name: string,
): IAttendanceRosterRow => ({
  id,
  employeeNo,
  name,
  departmentId: "dept-1",
  department: { name: "工程處本部" },
  jobTitle: { title: "工務行政" },
});

const shiftDay = (params: {
  employeeId: string;
  workDate: string;
  dayType: WorkDayType;
  pattern?: ShiftPattern;
}): IShiftDayWithPattern =>
  ({
    id: `sd-${params.employeeId}-${params.workDate}`,
    accountBookId: ACCOUNT_BOOK_ID,
    employeeId: params.employeeId,
    workDate: params.workDate,
    dayType: params.dayType,
    shiftPatternId: params.pattern?.id ?? null,
    shiftPattern: params.pattern ?? null,
  }) as unknown as EmployeeShiftDay & { shiftPattern: ShiftPattern | null };

const punchAt = (params: {
  employeeId: string;
  workDate: string;
  punchType: PunchType;
  /** Info: (20260813 - Julian) UTC ISO；台北為 UTC+8，換算寫在每個呼叫點的註解裡 */
  utc: string;
}): AttendancePunch =>
  ({
    id: `p-${params.employeeId}-${params.utc}`,
    accountBookId: ACCOUNT_BOOK_ID,
    employeeId: params.employeeId,
    workDate: params.workDate,
    punchType: params.punchType,
    punchedAt: new Date(params.utc),
    workLocationId: "loc-a",
    latitudeCipher: "CIPHERTEXT-LATITUDE",
    longitudeCipher: "CIPHERTEXT-LONGITUDE",
    accuracyMeters: 18,
    distanceMeters: 42,
    piiAlgorithm: "AES-256-GCM",
    piiKeyVersion: 1,
  }) as unknown as AttendancePunch;

interface IHarness {
  service: AttendanceResultService;
  scopedEmployeeIds: string[][];
}

const buildService = (options: {
  roster?: IAttendanceRosterRow[];
  shiftDays?: IShiftDayWithPattern[];
  punches?: AttendancePunch[];
}): IHarness => {
  const scopedEmployeeIds: string[][] = [];

  const employees: IEmployeeRepository = {
    findByUserId: async () => null,
    findByAccountBookAndEmails: async () => [],
    linkUser: async () => false,
    findRosterInPeriod: async () => options.roster ?? [],
    findByIdInAccountBook: async () => null,
  };

  const schedule: IAttendanceScheduleRepository = {
    findShiftDays: async () => [],
    findShiftDaysInRange: async (params) => {
      scopedEmployeeIds.push(params.employeeIds);
      return options.shiftDays ?? [];
    },
    // Info: (20260813 - Julian) 判定不寫排班；由排班 service 的測試覆蓋
    upsertShiftDay: async () => {
      throw new Error("not used by the result matrix");
    },
  };

  const punches: IAttendancePunchRepository = {
    create: async (input) => input as unknown as AttendancePunch,
    findByEmployeeAndWorkDate: async () => [],
    findByWorkDateRange: async (params) => {
      scopedEmployeeIds.push(params.employeeIds);
      return options.punches ?? [];
    },
  };

  return {
    service: new AttendanceResultService(
      employees,
      schedule,
      punches,
      "Asia/Taipei",
    ),
    scopedEmployeeIds,
  };
};

// Info: (20260813 - Julian) 演示當下：2026-08-13 02:00 台北。刻意選在夜班尚未收工的時刻
const EVALUATED_AT = new Date("2026-08-12T18:00:00.000Z");

describe("AttendanceResultService", () => {
  describe("矩陣的形狀", () => {
    it("欄位由 from/to 展開，缺資料的那一天不會整欄消失", async () => {
      const { service } = buildService({
        roster: [rosterRow("emp-2", "EMP002", "王小明")],
        shiftDays: [
          shiftDay({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            dayType: WorkDayType.WORK,
            pattern: OFFICE,
          }),
        ],
      });

      const matrix = await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-11", to: "2026-08-13" },
        evaluatedAt: EVALUATED_AT,
      });

      expect(matrix.workDates).toEqual([
        "2026-08-11",
        "2026-08-12",
        "2026-08-13",
      ]);
      expect(matrix.rows[0].days).toHaveLength(3);
      expect(matrix.rows[0].days[0].status).toBe(
        AttendanceDayStatus.NO_SCHEDULE,
      );
      expect(matrix.evaluatedAt).toBe(EVALUATED_AT.toISOString());
    });

    it("名冊為空時回空矩陣而不是錯誤 —— 查無此人與查無資料不該長成失敗", async () => {
      const { service } = buildService({ roster: [] });

      const matrix = await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-01", to: "2026-08-31", employeeId: "emp-x" },
        evaluatedAt: EVALUATED_AT,
      });

      expect(matrix.rows).toEqual([]);
      expect(matrix.workDates).toHaveLength(31);
    });

    it("查詢一律帶著名冊的 employeeIds，不退化成整本帳本掃描", async () => {
      const { service, scopedEmployeeIds } = buildService({
        roster: [rosterRow("emp-2", "EMP002", "王小明")],
      });

      await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-11", to: "2026-08-13" },
        evaluatedAt: EVALUATED_AT,
      });

      expect(scopedEmployeeIds).toHaveLength(2);
      scopedEmployeeIds.forEach((ids) => expect(ids).toEqual(["emp-2"]));
    });
  });

  describe("phase：status 之外必須另外交代「這一天算完了沒」", () => {
    it("未來的上班日回 NORMAL，但 phase 是 UPCOMING", async () => {
      const { service } = buildService({
        roster: [rosterRow("emp-2", "EMP002", "王小明")],
        shiftDays: [
          shiftDay({
            employeeId: "emp-2",
            workDate: "2026-08-14",
            dayType: WorkDayType.WORK,
            pattern: OFFICE,
          }),
        ],
      });

      const matrix = await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-14", to: "2026-08-14" },
        evaluatedAt: EVALUATED_AT,
      });

      const day = matrix.rows[0].days[0];
      /**
       * Info: (20260813 - Julian) 這一條是 phase 存在的全部理由：
       * 光看 status，下個月每一格都會被畫成綠色的「正常出勤」。
       */
      expect(day.status).toBe(AttendanceDayStatus.NORMAL);
      expect(day.phase).toBe(AttendanceDayPhase.UPCOMING);
      expect(matrix.rows[0].summary.normalDays).toBe(0);
      expect(matrix.rows[0].summary.pendingDays).toBe(1);
    });

    it("跨夜班以「窗迄 + 寬限」為界，不以日曆換日為界", async () => {
      const { service } = buildService({
        roster: [rosterRow("emp-10", "EMP010", "李國強")],
        shiftDays: [
          shiftDay({
            employeeId: "emp-10",
            workDate: "2026-08-12",
            dayType: WorkDayType.WORK,
            pattern: NIGHT,
          }),
        ],
        // Info: (20260813 - Julian) 8/12 20:05 台北進場，尚未打下班卡
        punches: [
          punchAt({
            employeeId: "emp-10",
            workDate: "2026-08-12",
            punchType: PunchType.CLOCK_IN,
            utc: "2026-08-12T12:05:00.000Z",
          }),
        ],
      });

      const matrix = await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-12", to: "2026-08-12" },
        evaluatedAt: EVALUATED_AT,
      });

      const day = matrix.rows[0].days[0];
      /**
       * Info: (20260813 - Julian) 現在是 8/13 02:00，日曆日上 8/12 早就過了 ——
       * 但這位同仁還在工地上，窗迄要到 05:00。以換日為界會判他漏打下班卡。
       */
      expect(day.phase).toBe(AttendanceDayPhase.IN_PROGRESS);
      expect(day.status).toBe(AttendanceDayStatus.NORMAL);
      expect(day.exceptions).toEqual([]);
      expect(day.shiftKind).toBe(ShiftPatternKind.FIXED);
    });

    it("已過完的上班日 phase 為 CONCLUDED 並計入 normalDays", async () => {
      const { service } = buildService({
        roster: [rosterRow("emp-2", "EMP002", "王小明")],
        shiftDays: [
          shiftDay({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            dayType: WorkDayType.WORK,
            pattern: OFFICE,
          }),
        ],
        // Info: (20260813 - Julian) 8/12 08:55 進、18:10 出（台北）
        punches: [
          punchAt({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            punchType: PunchType.CLOCK_IN,
            utc: "2026-08-12T00:55:00.000Z",
          }),
          punchAt({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            punchType: PunchType.CLOCK_OUT,
            utc: "2026-08-12T10:10:00.000Z",
          }),
        ],
      });

      const matrix = await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-12", to: "2026-08-12" },
        evaluatedAt: EVALUATED_AT,
      });

      const day = matrix.rows[0].days[0];
      expect(day.phase).toBe(AttendanceDayPhase.CONCLUDED);
      expect(day.status).toBe(AttendanceDayStatus.NORMAL);
      // Info: (20260813 - Julian) 早到不多算工時：進場夾到窗起 540，出場 1090 夾到 1080
      expect(day.workedMinutes).toBe(1080 - 540 - 60);
      expect(matrix.rows[0].summary.normalDays).toBe(1);
      expect(matrix.rows[0].summary.pendingDays).toBe(0);
    });
  });

  describe("統計", () => {
    it("遲到累計天數與分鐘數，且不捏造未檢查過的型別", async () => {
      const { service } = buildService({
        roster: [rosterRow("emp-2", "EMP002", "王小明")],
        shiftDays: [
          shiftDay({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            dayType: WorkDayType.WORK,
            pattern: OFFICE,
          }),
        ],
        // Info: (20260813 - Julian) 8/12 09:47 進、18:10 出（台北）→ 遲到 47 分
        punches: [
          punchAt({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            punchType: PunchType.CLOCK_IN,
            utc: "2026-08-12T01:47:00.000Z",
          }),
          punchAt({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            punchType: PunchType.CLOCK_OUT,
            utc: "2026-08-12T10:10:00.000Z",
          }),
        ],
      });

      const matrix = await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-12", to: "2026-08-12" },
        evaluatedAt: EVALUATED_AT,
      });

      const summary = matrix.rows[0].summary;
      expect(summary.exceptionDays).toBe(1);
      expect(summary.exceptions).toEqual([
        { type: AttendanceExceptionType.LATE, days: 1, minutes: 47 },
      ]);
      /**
       * Info: (20260813 - Julian) 瞬移偵測（G5）本期未實作。補一筆 `days: 0`
       * 等於宣稱「查過了、沒有」，而系統根本沒查 —— 沒發生與沒檢查不能同形。
       */
      expect(
        summary.exceptions.map((exception) => exception.type),
      ).not.toContain(AttendanceExceptionType.SUSPICIOUS_JUMP);
    });

    it("休假日有打卡算加班事實，不算異常", async () => {
      const { service } = buildService({
        roster: [rosterRow("emp-2", "EMP002", "王小明")],
        shiftDays: [
          shiftDay({
            employeeId: "emp-2",
            workDate: "2026-08-09",
            dayType: WorkDayType.REGULAR_OFF,
          }),
        ],
        punches: [
          punchAt({
            employeeId: "emp-2",
            workDate: "2026-08-09",
            punchType: PunchType.CLOCK_IN,
            utc: "2026-08-09T01:00:00.000Z",
          }),
        ],
      });

      const matrix = await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-09", to: "2026-08-09" },
        evaluatedAt: EVALUATED_AT,
      });

      const day = matrix.rows[0].days[0];
      expect(day.status).toBe(AttendanceDayStatus.OFF_DAY);
      expect(day.dayType).toBe(WorkDayType.REGULAR_OFF);
      expect(day.shiftName).toBeNull();
      expect(matrix.rows[0].summary.exceptions).toEqual([]);
      expect(matrix.rows[0].summary.scheduledWorkDays).toBe(0);
    });
  });

  describe("護欄", () => {
    it("區間超過上限即拒絕 —— 即時計算的前提是成本有界", async () => {
      const { service } = buildService({ roster: [] });

      await expect(
        service.evaluateRange({
          accountBookId: ACCOUNT_BOOK_ID,
          // Info: (20260813 - Julian) 93 天，上限 92
          query: { from: "2026-01-01", to: "2026-04-03" },
          evaluatedAt: EVALUATED_AT,
        }),
      ).rejects.toThrow(AppError);

      await expect(
        service.evaluateRange({
          accountBookId: ACCOUNT_BOOK_ID,
          query: { from: "2026-01-01", to: "2026-04-03" },
          evaluatedAt: EVALUATED_AT,
        }),
      ).rejects.toMatchObject({
        apiCode: API_ERRORS.VA_ATTENDANCE_RANGE_TOO_LARGE.code,
      });
    });

    it("剛好等於上限的區間放行", async () => {
      const { service } = buildService({ roster: [] });

      const matrix = await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        // Info: (20260813 - Julian) 92 天
        query: { from: "2026-01-01", to: "2026-04-02" },
        evaluatedAt: EVALUATED_AT,
      });

      expect(matrix.workDates).toHaveLength(92);
    });

    it("回應不含任何座標密文", async () => {
      const { service } = buildService({
        roster: [rosterRow("emp-2", "EMP002", "王小明")],
        shiftDays: [
          shiftDay({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            dayType: WorkDayType.WORK,
            pattern: OFFICE,
          }),
        ],
        punches: [
          punchAt({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            punchType: PunchType.CLOCK_IN,
            utc: "2026-08-12T00:55:00.000Z",
          }),
        ],
      });

      const matrix = await service.evaluateRange({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-12", to: "2026-08-12" },
        evaluatedAt: EVALUATED_AT,
      });

      /**
       * Info: (20260813 - Julian) repository 回的是完整的打卡列（含密文），
       * service 必須在投影成 `IPunchSnapshot` 時就把它們丟掉。
       * 這一條驗的不是「今天沒漏」，是**日後有人順手展開物件時會有人喊停**。
       */
      const serialised = JSON.stringify(matrix);
      expect(serialised).not.toContain("CIPHERTEXT");
      expect(serialised).not.toContain("Cipher");
      expect(serialised).not.toContain("distanceMeters");
    });
  });
});

import { describe, it, expect } from "@jest/globals";
import { Employee, ShiftPattern } from "@/generated";
import { ShiftPatternKind, WorkDayType } from "@/constants/attendance";
import { AttendanceScheduleService } from "@/services/attendance_schedule.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  attendanceScheduleUpdateSchema,
  attendanceScheduleQuerySchema,
} from "@/validators/attendance";
import {
  IAttendanceRosterRow,
  IEmployeeRepository,
} from "@/repositories/employee.repo";
import {
  IAttendanceScheduleRepository,
  IShiftDayInput,
  IShiftDayWithPattern,
} from "@/repositories/attendance_schedule.repo";
import { IShiftPatternRepository } from "@/repositories/shift_pattern.repo";
import { assertSchedulableDay } from "@/repositories/attendance_schedule_invariant";

/**
 * Info: (20260813 - Julian) 班別與排班寫入。
 *
 * 這裡最值得守的不是「排班存得進去」，而是**非法狀態擋在三層**：
 * zod 的可辨識聯集擋 API 呼叫者、`assertSchedulableDay` 擋繞過 API 的寫入、
 * 跨帳本檢查擋租戶隔離的洞。三者各有一組測試。
 */

const ACCOUNT_BOOK_ID = "demo-book-public-works";

// Info: (20260813 - Julian) 工地日班：窗＝核心，因此 kind 應衍生為 FIXED
const SITE_DAY = {
  id: "shift-day",
  code: "SITE-DAY",
  name: "工地日班",
  accountBookId: ACCOUNT_BOOK_ID,
  windowStartMinute: 450,
  windowEndMinute: 1020,
  coreStartMinute: 450,
  coreEndMinute: 1020,
  requiredWorkMinutes: 480,
  breakMinutes: 60,
} as ShiftPattern;

// Info: (20260813 - Julian) 彈性班：窗 07:00–20:00、核心 10:00–16:00
const FLEXIBLE = {
  ...SITE_DAY,
  id: "shift-flex",
  code: "ENG-FLEX",
  name: "工程師彈性班",
  windowStartMinute: 420,
  windowEndMinute: 1200,
  coreStartMinute: 600,
  coreEndMinute: 960,
  requiredWorkMinutes: 420,
} as ShiftPattern;

const rosterRow = (
  id: string,
  employeeNo: string,
  departmentId: string | null = "dept-1",
): IAttendanceRosterRow => ({
  id,
  employeeNo,
  name: "王小明",
  departmentId,
  department: departmentId ? { name: "第一工務所" } : null,
  jobTitle: { title: "工地工程師" },
});

/**
 * Info: (20260817 - Luphia) 操作者與被排班者刻意用不同 id：主管閘問的必須是
 * **操作者**是不是主管，而不是被改的那個人。兩者同值的 fixture 會讓
 * 「問錯人」這個錯誤通過測試。
 */
const ACTOR_MANAGER_ID = "emp-1";
const TARGET_EMPLOYEE_ID = "emp-2";

interface IHarness {
  service: AttendanceScheduleService;
  written: IShiftDayInput[];
  rosterQueries: { departmentId?: string }[];
  managerQueries: string[];
}

const buildService = (options: {
  roster?: IAttendanceRosterRow[];
  shiftDays?: IShiftDayWithPattern[];
  patterns?: ShiftPattern[];
  employeeInBook?: boolean;
  upsertThrows?: Error;
  /** Info: (20260817 - Luphia) 操作者是不是部門主管；預設是，未指定時測的不是這道閘 */
  actorIsManager?: boolean;
}): IHarness => {
  const written: IShiftDayInput[] = [];
  const rosterQueries: { departmentId?: string }[] = [];
  const managerQueries: string[] = [];

  const employees: IEmployeeRepository = {
    findByUserId: async () => null,
    findByAccountBookAndEmails: async () => [],
    linkUser: async () => false,
    unlinkUser: async () => false,
    findRosterInPeriod: async (params) => {
      rosterQueries.push({ departmentId: params.departmentId });
      return options.roster ?? [];
    },
    findByIdInAccountBook: async () =>
      options.employeeInBook === false
        ? null
        : ({ id: TARGET_EMPLOYEE_ID, employeeNo: "EMP002" } as Employee),
    isDepartmentManager: async (params) => {
      managerQueries.push(params.employeeId);
      return options.actorIsManager ?? true;
    },
  };

  const schedule: IAttendanceScheduleRepository = {
    findShiftDays: async () => [],
    findShiftDaysInRange: async () => options.shiftDays ?? [],
    upsertShiftDay: async (input) => {
      if (options.upsertThrows) throw options.upsertThrows;
      written.push(input);
      return {
        ...input,
        id: "sd-1",
        shiftPattern:
          options.patterns?.find(
            (pattern) => pattern.id === input.shiftPatternId,
          ) ?? null,
      } as unknown as IShiftDayWithPattern;
    },
  };

  const patterns: IShiftPatternRepository = {
    findByAccountBook: async () => options.patterns ?? [],
    findByIdInAccountBook: async (accountBookId, id) =>
      options.patterns?.find((pattern) => pattern.id === id) ?? null,
  };

  return {
    service: new AttendanceScheduleService(employees, schedule, patterns),
    written,
    rosterQueries,
    managerQueries,
  };
};

const shiftDay = (params: {
  employeeId: string;
  workDate: string;
  dayType: WorkDayType;
  pattern?: ShiftPattern;
}): IShiftDayWithPattern =>
  ({
    id: `sd-${params.workDate}`,
    accountBookId: ACCOUNT_BOOK_ID,
    employeeId: params.employeeId,
    workDate: params.workDate,
    dayType: params.dayType,
    shiftPatternId: params.pattern?.id ?? null,
    shiftPattern: params.pattern ?? null,
  }) as unknown as IShiftDayWithPattern;

describe("AttendanceScheduleService", () => {
  describe("A6 班別清單", () => {
    it("kind 由六個欄位衍生，不是資料庫欄位", async () => {
      const { service } = buildService({ patterns: [SITE_DAY, FLEXIBLE] });
      const list = await service.listShiftPatterns(ACCOUNT_BOOK_ID);

      expect(list.map((item) => [item.code, item.kind])).toEqual([
        ["SITE-DAY", ShiftPatternKind.FIXED],
        ["ENG-FLEX", ShiftPatternKind.FLEXIBLE],
      ]);
      // Info: (20260813 - Julian) 時間窗一併帶出來，排班畫面才畫得出「幾點到幾點」
      expect(list[1].window.coreStartMinute).toBe(600);
    });
  });

  describe("A7 排班月曆", () => {
    it("欄位由 from/to 展開，沒有排班的那一天回 null 而不是消失", async () => {
      const { service } = buildService({
        roster: [rosterRow("emp-2", "EMP002")],
        shiftDays: [
          shiftDay({
            employeeId: "emp-2",
            workDate: "2026-08-12",
            dayType: WorkDayType.WORK,
            pattern: SITE_DAY,
          }),
        ],
      });

      const calendar = await service.getCalendar({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-11", to: "2026-08-13" },
      });

      expect(calendar.workDates).toHaveLength(3);
      expect(calendar.rows[0].days.map((day) => day.dayType)).toEqual([
        null,
        WorkDayType.WORK,
        null,
      ]);
      expect(calendar.rows[0].days[1].shiftCode).toBe("SITE-DAY");
      expect(calendar.rows[0].days[1].shiftKind).toBe(ShiftPatternKind.FIXED);
    });

    it("部門篩選推到查詢層，不是撈回來再過濾", async () => {
      const { service, rosterQueries } = buildService({ roster: [] });

      await service.getCalendar({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-01", to: "2026-08-31", departmentId: "dept-1" },
      });

      expect(rosterQueries).toEqual([{ departmentId: "dept-1" }]);
    });

    it("區間上限與判定矩陣共用一個常數", async () => {
      const { service } = buildService({ roster: [] });

      await expect(
        service.getCalendar({
          accountBookId: ACCOUNT_BOOK_ID,
          // Info: (20260813 - Julian) 93 天，上限 92
          query: { from: "2026-01-01", to: "2026-04-03" },
        }),
      ).rejects.toMatchObject({
        apiCode: API_ERRORS.VA_ATTENDANCE_RANGE_TOO_LARGE.code,
      });
    });

    it("名冊為空時回空矩陣而不是錯誤", async () => {
      const { service } = buildService({ roster: [] });
      const calendar = await service.getCalendar({
        accountBookId: ACCOUNT_BOOK_ID,
        query: { from: "2026-08-01", to: "2026-08-03" },
      });
      expect(calendar.rows).toEqual([]);
      expect(calendar.workDates).toHaveLength(3);
    });
  });

  /**
   * Info: (20260817 - Luphia) 排班寫入的主管閘。
   *
   * 守的是一件無法事後復原的事：判定即時算、不落地，所以改一格排班就是改那一天的
   * 歷史判定（把上班日改成休假，曠職當場消失），而全系統只留一行日誌。
   * 讀取端仍是全帳本可見（計畫書 §7.3 第 1 順位的權限矩陣要處理的範圍），
   * 這三條只管寫入。
   */
  describe("A8 排班寫入限主管", () => {
    it("非主管改排班回 403，且一個字都沒有寫進去", async () => {
      const { service, written } = buildService({
        patterns: [SITE_DAY],
        actorIsManager: false,
      });

      await expect(
        service.updateScheduleDay({
          accountBookId: ACCOUNT_BOOK_ID,
          input: {
            employeeId: TARGET_EMPLOYEE_ID,
            workDate: "2026-08-14",
            dayType: WorkDayType.WORK,
            shiftPatternId: SITE_DAY.id,
          },
          actorEmployeeId: ACTOR_MANAGER_ID,
          actorEmployeeNo: "EMP001",
        }),
      ).rejects.toMatchObject({
        apiCode: API_ERRORS.FO_ATTENDANCE_SUPERVISOR_ONLY.code,
      });
      expect(written).toEqual([]);
    });

    /**
     * Info: (20260817 - Luphia) 閘要問的是**操作者**。問成被改的那個人，
     * 效果是「只要對主管排班就都放行」—— 完全反過來，而回應碼一模一樣。
     */
    it("閘問的是操作者，不是被改的那個人", async () => {
      const { service, managerQueries } = buildService({
        patterns: [SITE_DAY],
      });

      await service.updateScheduleDay({
        accountBookId: ACCOUNT_BOOK_ID,
        input: {
          employeeId: TARGET_EMPLOYEE_ID,
          workDate: "2026-08-14",
          dayType: WorkDayType.WORK,
          shiftPatternId: SITE_DAY.id,
        },
        actorEmployeeId: ACTOR_MANAGER_ID,
        actorEmployeeNo: "EMP001",
      });

      expect(managerQueries).toEqual([ACTOR_MANAGER_ID]);
    });

    /**
     * Info: (20260817 - Luphia) 閘排在租戶檢查**之前**：非主管不該從錯誤碼分辨
     * 「這個員工 id 存不存在於本帳本」。403 與 404 的順序本身就是一個探測管道。
     */
    it("非主管拿別家帳本的員工 id 來試，得到 403 而不是 404", async () => {
      const { service } = buildService({
        employeeInBook: false,
        actorIsManager: false,
      });

      await expect(
        service.updateScheduleDay({
          accountBookId: ACCOUNT_BOOK_ID,
          input: {
            employeeId: "emp-from-another-book",
            workDate: "2026-08-14",
            dayType: WorkDayType.REGULAR_OFF,
            shiftPatternId: null,
          },
          actorEmployeeId: ACTOR_MANAGER_ID,
          actorEmployeeNo: "EMP001",
        }),
      ).rejects.toMatchObject({
        apiCode: API_ERRORS.FO_ATTENDANCE_SUPERVISOR_ONLY.code,
      });
    });
  });

  describe("A8 改單日排班", () => {
    it("改成上班日會帶上班別", async () => {
      const { service, written } = buildService({
        patterns: [SITE_DAY],
      });

      const cell = await service.updateScheduleDay({
        accountBookId: ACCOUNT_BOOK_ID,
        input: {
          employeeId: "emp-2",
          workDate: "2026-08-14",
          dayType: WorkDayType.WORK,
          shiftPatternId: SITE_DAY.id,
        },
        actorEmployeeId: ACTOR_MANAGER_ID,
        actorEmployeeNo: "EMP001",
      });

      expect(written).toHaveLength(1);
      expect(written[0].shiftPatternId).toBe(SITE_DAY.id);
      expect(cell.shiftName).toBe("工地日班");
    });

    it("改成休假時把班別明確寫成 null，不是省略", async () => {
      /**
       * Info: (20260813 - Julian) `undefined` 在 Prisma 的 update 裡的意思是
       * 「不要動這個欄位」—— 舊的班別會留在原地，於是休假日掛著一個班次。
       */
      const { service, written } = buildService({});

      await service.updateScheduleDay({
        accountBookId: ACCOUNT_BOOK_ID,
        input: {
          employeeId: "emp-2",
          workDate: "2026-08-14",
          dayType: WorkDayType.REGULAR_OFF,
          shiftPatternId: null,
        },
        actorEmployeeId: ACTOR_MANAGER_ID,
        actorEmployeeNo: "EMP001",
      });

      expect(written[0].shiftPatternId).toBeNull();
      expect(Object.keys(written[0])).toContain("shiftPatternId");
    });

    it("員工不屬於這個帳本即 404，不靜默寫入", async () => {
      const { service, written } = buildService({ employeeInBook: false });

      await expect(
        service.updateScheduleDay({
          accountBookId: ACCOUNT_BOOK_ID,
          input: {
            employeeId: "emp-from-another-book",
            workDate: "2026-08-14",
            dayType: WorkDayType.REGULAR_OFF,
            shiftPatternId: null,
          },
          actorEmployeeId: ACTOR_MANAGER_ID,
          actorEmployeeNo: "EMP001",
        }),
      ).rejects.toMatchObject({ apiCode: API_ERRORS.NF_EMPLOYEE.code });
      expect(written).toEqual([]);
    });

    it("班別不屬於這個帳本即 404 —— 租戶隔離在資料庫層沒有這條約束", async () => {
      const { service, written } = buildService({ patterns: [SITE_DAY] });

      await expect(
        service.updateScheduleDay({
          accountBookId: ACCOUNT_BOOK_ID,
          input: {
            employeeId: "emp-2",
            workDate: "2026-08-14",
            dayType: WorkDayType.WORK,
            shiftPatternId: "shift-from-another-book",
          },
          actorEmployeeId: ACTOR_MANAGER_ID,
          actorEmployeeNo: "EMP001",
        }),
      ).rejects.toMatchObject({ apiCode: API_ERRORS.NF_SHIFT_PATTERN.code });
      expect(written).toEqual([]);
    });

    it("repository 的不變式違反轉成 400，不是 500", async () => {
      /**
       * Info: (20260813 - Julian) 走 API 到不了這裡（zod 已擋），
       * 但種子腳本與匯入會 —— 而那時資料庫完全正常，回 500 會指向錯誤的方向。
       */
      const { service } = buildService({
        patterns: [SITE_DAY],
        upsertThrows: (() => {
          try {
            assertSchedulableDay({
              dayType: WorkDayType.WORK,
              shiftPatternId: null,
            });
            return new Error("unreachable");
          } catch (error) {
            return error as Error;
          }
        })(),
      });

      await expect(
        service.updateScheduleDay({
          accountBookId: ACCOUNT_BOOK_ID,
          input: {
            employeeId: "emp-2",
            workDate: "2026-08-14",
            dayType: WorkDayType.WORK,
            shiftPatternId: SITE_DAY.id,
          },
          actorEmployeeId: ACTOR_MANAGER_ID,
          actorEmployeeNo: "EMP001",
        }),
      ).rejects.toMatchObject({
        apiCode: API_ERRORS.VA_SCHEDULE_DAY_INVALID.code,
      });
    });

    it("其他錯誤照原樣往上拋，不被誤標成驗證失敗", async () => {
      const { service } = buildService({
        upsertThrows: new Error("connection reset"),
      });

      await expect(
        service.updateScheduleDay({
          accountBookId: ACCOUNT_BOOK_ID,
          input: {
            employeeId: "emp-2",
            workDate: "2026-08-14",
            dayType: WorkDayType.REGULAR_OFF,
            shiftPatternId: null,
          },
          actorEmployeeId: ACTOR_MANAGER_ID,
          actorEmployeeNo: "EMP001",
        }),
      ).rejects.not.toBeInstanceOf(AppError);
    });
  });

  describe("非法狀態在 zod 這一層就不可表示（ADR 019）", () => {
    it("上班日沒帶班別 —— 解析失敗，不是靠 if 擋掉", () => {
      const parsed = attendanceScheduleUpdateSchema.safeParse({
        employeeId: "emp-2",
        workDate: "2026-08-14",
        dayType: WorkDayType.WORK,
        shiftPatternId: null,
      });
      expect(parsed.success).toBe(false);
    });

    it("休假日卻帶了班別 —— 同樣解析失敗", () => {
      const parsed = attendanceScheduleUpdateSchema.safeParse({
        employeeId: "emp-2",
        workDate: "2026-08-14",
        dayType: WorkDayType.REGULAR_OFF,
        shiftPatternId: "shift-day",
      });
      expect(parsed.success).toBe(false);
    });

    it("休假日省略班別也不行 —— 必須明確寫 null，才會清掉舊的", () => {
      const parsed = attendanceScheduleUpdateSchema.safeParse({
        employeeId: "emp-2",
        workDate: "2026-08-14",
        dayType: WorkDayType.REGULAR_OFF,
      });
      expect(parsed.success).toBe(false);
    });

    it("兩種合法組合都通過", () => {
      expect(
        attendanceScheduleUpdateSchema.safeParse({
          employeeId: "emp-2",
          workDate: "2026-08-14",
          dayType: WorkDayType.WORK,
          shiftPatternId: "shift-day",
        }).success,
      ).toBe(true);

      expect(
        attendanceScheduleUpdateSchema.safeParse({
          employeeId: "emp-2",
          workDate: "2026-08-14",
          dayType: WorkDayType.HOLIDAY,
          shiftPatternId: null,
        }).success,
      ).toBe(true);
    });

    it("不存在的日曆日擋在 schema：2026-02-31 不是一天", () => {
      expect(
        attendanceScheduleQuerySchema.safeParse({
          from: "2026-02-31",
          to: "2026-03-01",
        }).success,
      ).toBe(false);
    });
  });
});

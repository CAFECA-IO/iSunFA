import { AttendancePunch, Employee } from "@/generated";
import {
  DEMO_LATE_GRACE_MINUTES,
  DEMO_PRESENCE_STALE_MINUTES,
  DEMO_TIME_ZONE,
  MINUTES_PER_DAY,
  PresenceStatus,
  PunchType,
  WorkDayType,
} from "@/constants/attendance";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  IPresencePunch,
  isExpectedAbsent,
  resolvePresence,
} from "@/lib/attendance_presence";
import { toShiftWindow } from "@/lib/attendance_schedule_view";
import {
  minutesFromWorkDateStart,
  previousIsoDate,
  toZonedParts,
} from "@/lib/utils/attendance_time";
import {
  IPresenceEntry,
  IPresenceExpectedAbsentee,
  IPresenceLocationSummary,
  IPresenceRoster,
  IPresenceSummary,
} from "@/interfaces/attendance";
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
  attendancePunchRepo,
  IAttendancePunchRepository,
} from "@/repositories/attendance_punch.repo";
import {
  IWorkLocationRepository,
  workLocationRepo,
} from "@/repositories/work_location.repo";

/**
 * Info: (20260813 - Julian) 現場在班狀態（A3 / A4 / A10）。**即時推導，不讀快取表。**
 *
 * ## 三個數字回答三個不同的問題
 *
 * 看板上的「在班 / 未打下班卡 / 未到工」不是一組互斥的分類，
 * 而是三個獨立的計數。母文件 §D10.6 要求它們必須同時出現：
 *
 * - **在班**：系統知道他在
 * - **未打下班卡（STALE）**：系統**不知道**他在不在
 * - **未到工**：排了班、時間到了，系統沒有收到任何打卡
 *
 * 一個只顯示「在班 42 人」的看板，會讓人以為現場就是 42 個人。
 * 三個數字並列，才誠實地表達了「系統知道什麼、不知道什麼」。
 *
 * ## 為什麼要撈昨天
 *
 * 夜間施工班的打卡 `workDate` 是昨天。只看今天的話，凌晨的現場看板
 * 會顯示零人，而工地上正有一整班人在灌漿。
 */

const asPresencePunch = (
  punch: AttendancePunch,
  workDate: string,
  timeZone: string,
): IPresencePunch => ({
  // Info: (20260813 - Julian) Prisma 回字面量聯集，`IPunchSnapshot` 要 TS enum；值域一致由 enum mirror 測試保證
  punchType: punch.punchType as PunchType,
  minuteOfDay: minutesFromWorkDateStart(punch.punchedAt, workDate, timeZone),
  workLocationId: punch.workLocationId,
});

// Info: (20260813 - Julian) 巢狀 Map：兩個 id 串成字串當鍵就得先回答「分隔符會不會撞」
const groupBy = <T>(
  items: T[],
  outer: (item: T) => string,
  inner: (item: T) => string,
): Map<string, Map<string, T[]>> => {
  const result = new Map<string, Map<string, T[]>>();
  for (const item of items) {
    const byInner = result.get(outer(item)) ?? new Map<string, T[]>();
    const key = inner(item);
    byInner.set(key, [...(byInner.get(key) ?? []), item]);
    result.set(outer(item), byInner);
  }
  return result;
};

interface IPresenceScan {
  workDate: string;
  entries: IPresenceEntry[];
  expectedAbsentees: IPresenceExpectedAbsentee[];
}

export class AttendancePresenceService {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly schedule: IAttendanceScheduleRepository,
    private readonly punches: IAttendancePunchRepository,
    private readonly locations: IWorkLocationRepository,
    private readonly timeZone: string = DEMO_TIME_ZONE,
  ) {}

  // Info: (20260813 - Julian) A3：各地點人數 + 全帳本未到工名單
  public async getSummary(
    accountBookId: string,
    observedAt: Date,
  ): Promise<IPresenceSummary> {
    const [scan, locations] = await Promise.all([
      this.scan(accountBookId, observedAt),
      this.locations.findByAccountBook(accountBookId),
    ]);

    const byLocation = new Map<string, { onSite: number; stale: number }>();
    for (const entry of scan.entries) {
      const bucket = byLocation.get(entry.workLocationId) ?? {
        onSite: 0,
        stale: 0,
      };
      if (entry.status === PresenceStatus.STALE) bucket.stale += 1;
      else bucket.onSite += 1;
      byLocation.set(entry.workLocationId, bucket);
    }

    /**
     * Info: (20260813 - Julian) 沒有人的地點**也要列出來**，人數印 0。
     *
     * 只列有人的地點，會讓「這個工區今天沒有人」與「這個工區不存在」
     * 在畫面上長得一模一樣 —— 而前者正是工地主任要立刻知道的事。
     */
    const summaries: IPresenceLocationSummary[] = locations.map((location) => {
      const bucket = byLocation.get(location.id) ?? { onSite: 0, stale: 0 };
      return {
        workLocationId: location.id,
        code: location.code,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: location.radiusMeters,
        onSiteCount: bucket.onSite,
        staleCount: bucket.stale,
      };
    });

    return {
      observedAt: observedAt.toISOString(),
      timeZone: this.timeZone,
      workDate: scan.workDate,
      locations: summaries,
      onSiteTotal: scan.entries.filter(
        (entry) => entry.status === PresenceStatus.ON_SITE,
      ).length,
      staleTotal: scan.entries.filter(
        (entry) => entry.status === PresenceStatus.STALE,
      ).length,
      expectedAbsentees: scan.expectedAbsentees,
    };
  }

  // Info: (20260813 - Julian) A4：單一地點的到班名單
  public async getLocationRoster(params: {
    accountBookId: string;
    workLocationId: string;
    observedAt: Date;
  }): Promise<IPresenceRoster> {
    const { accountBookId, workLocationId, observedAt } = params;

    const location = await this.locations.findById(workLocationId);
    /**
     * Info: (20260813 - Julian) 找不到就 404，不回空名單。
     *
     * 一個打錯的地點 id 若回「現場 0 人」，在職安場景下是最危險的一種回應 ——
     * 它與「這個工區真的沒有人」長得一模一樣，而看的人會相信後者。
     */
    if (!location || location.accountBookId !== accountBookId) {
      throw new AppError(API_ERRORS.NF_WORK_LOCATION_UNKNOWN);
    }

    const scan = await this.scan(accountBookId, observedAt);

    return {
      workLocationId: location.id,
      code: location.code,
      name: location.name,
      observedAt: observedAt.toISOString(),
      timeZone: this.timeZone,
      entries: scan.entries.filter(
        (entry) => entry.workLocationId === location.id,
      ),
    };
  }

  /**
   * Info: (20260813 - Julian) A10：匯出用的名單。不指定地點時回全帳本每一個地點。
   *
   * 回傳的是**結構**而不是 CSV 字串：CSV 的欄位標題與狀態文案需要語系，
   * 而 service 沒有 i18n context。組字串那一步留在 route。
   */
  public async getExportRosters(params: {
    accountBookId: string;
    workLocationId?: string;
    observedAt: Date;
  }): Promise<IPresenceRoster[]> {
    const { accountBookId, workLocationId, observedAt } = params;

    if (workLocationId) {
      return [await this.getLocationRoster({ ...params, workLocationId })];
    }

    const [scan, locations] = await Promise.all([
      this.scan(accountBookId, observedAt),
      this.locations.findByAccountBook(accountBookId),
    ]);

    return locations.map((location) => ({
      workLocationId: location.id,
      code: location.code,
      name: location.name,
      observedAt: observedAt.toISOString(),
      timeZone: this.timeZone,
      entries: scan.entries.filter(
        (entry) => entry.workLocationId === location.id,
      ),
    }));
  }

  /**
   * Info: (20260813 - Julian) 一次掃出「誰在現場」與「誰該到而未到」。
   *
   * 兩者共用同一批查詢：名冊、兩天的排班、兩天的打卡。分成兩支各查一次，
   * 兩個數字就會來自兩個時間點的資料庫狀態 —— 而它們是要並排顯示的。
   */
  private async scan(
    accountBookId: string,
    observedAt: Date,
  ): Promise<IPresenceScan> {
    const today = toZonedParts(observedAt, this.timeZone).isoDate;
    const yesterday = previousIsoDate(today);
    // Info: (20260813 - Julian) 由新到舊，`resolvePresence` 依賴這個順序
    const workDates = [today, yesterday];

    const roster = await this.employees.findRosterInPeriod({
      accountBookId,
      from: yesterday,
      to: today,
    });

    if (roster.length === 0) {
      return { workDate: today, entries: [], expectedAbsentees: [] };
    }

    const employeeIds = roster.map((employee) => employee.id);
    const [shiftDays, punches, locations] = await Promise.all([
      this.schedule.findShiftDaysInRange({
        accountBookId,
        employeeIds,
        from: yesterday,
        to: today,
      }),
      this.punches.findByWorkDateRange({
        accountBookId,
        employeeIds,
        from: yesterday,
        to: today,
      }),
      this.locations.findByAccountBook(accountBookId),
    ]);

    const scheduleIndex = groupBy(
      shiftDays,
      (day) => day.employeeId,
      (day) => day.workDate,
    );
    const punchIndex = groupBy(
      punches,
      (punch) => punch.employeeId,
      (punch) => punch.workDate,
    );
    const locationNames = new Map(
      locations.map((location) => [location.id, location.name]),
    );

    // Info: (20260813 - Julian) 每個工作日的「現在」只算一次，全體共用
    const nowByWorkDate = new Map(
      workDates.map((workDate) => [
        workDate,
        minutesFromWorkDateStart(observedAt, workDate, this.timeZone),
      ]),
    );

    const entries: IPresenceEntry[] = [];
    const expectedAbsentees: IPresenceExpectedAbsentee[] = [];

    for (const employee of roster) {
      const shiftOf = (workDate: string): IShiftDayWithPattern | undefined =>
        scheduleIndex.get(employee.id)?.get(workDate)?.[0];
      const punchesOf = (workDate: string): AttendancePunch[] =>
        punchIndex.get(employee.id)?.get(workDate) ?? [];

      const session = resolvePresence(
        workDates.map((workDate) => {
          const day = shiftOf(workDate);
          return {
            workDate,
            shift: day ? toShiftWindow(day) : null,
            nowMinuteOfDay: nowByWorkDate.get(workDate) ?? 0,
            punches: punchesOf(workDate).map((punch) =>
              asPresencePunch(punch, workDate, this.timeZone),
            ),
          };
        }),
        {
          staleGraceMinutes: DEMO_PRESENCE_STALE_MINUTES,
          minutesPerDay: MINUTES_PER_DAY,
        },
      );

      if (session) {
        entries.push({
          employeeId: employee.id,
          employeeNo: employee.employeeNo,
          name: employee.name,
          departmentName: employee.department?.name ?? null,
          jobTitle: employee.jobTitle?.title ?? null,
          status: session.status,
          workDate: session.workDate,
          sinceMinute: session.sinceMinute,
          workLocationId: session.workLocationId,
          workLocationName:
            locationNames.get(session.workLocationId) ?? session.workLocationId,
        });
        /**
         * Info: (20260813 - Julian) 已經在現場的人不再列為未到工。
         *
         * 昨晚的夜班還沒收工、今天又排了日班的人會同時符合兩邊，
         * 而「他在現場」與「他沒來」不能同時印在同一張看板上。
         */
        continue;
      }

      const todayShiftDay = shiftOf(today);
      const todayShift = todayShiftDay ? toShiftWindow(todayShiftDay) : null;
      if (
        !todayShiftDay ||
        !todayShift ||
        String(todayShiftDay.dayType) !== WorkDayType.WORK
      ) {
        continue;
      }

      if (
        isExpectedAbsent({
          nowMinuteOfDay: nowByWorkDate.get(today) ?? 0,
          shift: todayShift,
          lateGraceMinutes: DEMO_LATE_GRACE_MINUTES,
          hasAnyPunch: punchesOf(today).length > 0,
        })
      ) {
        expectedAbsentees.push({
          employeeId: employee.id,
          employeeNo: employee.employeeNo,
          name: employee.name,
          departmentName: employee.department?.name ?? null,
          jobTitle: employee.jobTitle?.title ?? null,
          shiftName: todayShiftDay.shiftPattern?.name ?? null,
          coreStartMinute: todayShift.coreStartMinute,
        });
      }
    }

    return { workDate: today, entries, expectedAbsentees };
  }
}

export const attendancePresenceService = new AttendancePresenceService(
  employeeRepo,
  attendanceScheduleRepo,
  attendancePunchRepo,
  workLocationRepo,
);

// Info: (20260813 - Julian) 匯出時要記名，而 `Employee` 才有工號 —— 只有姓名在事故調查時不足以指認
export const rosterActorLabel = (employee: Employee): string =>
  `${employee.name}（${employee.employeeNo}）`;

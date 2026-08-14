import { randomUUID } from "crypto";
import { Employee, WorkLocation } from "@/generated";
import {
  DEMO_MAX_ACCURACY_METERS,
  DEMO_TIME_ZONE,
  PunchType,
  PunchVerification,
} from "@/constants/attendance";
import { HrPiiTable } from "@/constants/hr_pii";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { encryptPii } from "@/lib/hr_pii_crypto";
import { deriveShiftPatternKind } from "@/lib/attendance_rules";
import { findNearestGeofence, IGeofenceMatch } from "@/lib/attendance_geofence";
import { toShiftWindow } from "@/lib/attendance_schedule_view";
import {
  minutesFromWorkDateStart,
  previousIsoDate,
  resolveWorkDate,
  toZonedParts,
} from "@/lib/utils/attendance_time";
import {
  IOutOfFencePayload,
  IPunchRequest,
  ITodayStatus,
  IWorkLocationSummary,
} from "@/interfaces/attendance";
import {
  attendancePunchRepo,
  IAttendancePunchRepository,
} from "@/repositories/attendance_punch.repo";
import {
  attendanceScheduleRepo,
  IAttendanceScheduleRepository,
} from "@/repositories/attendance_schedule.repo";
import {
  IWorkLocationRepository,
  workLocationRepo,
} from "@/repositories/work_location.repo";

/**
 * Info: (20260813 - Julian) 打卡主流程。到班的定義是「人在登記的地點」——
 * 座標未落入任何圍欄的打卡不會寫進資料庫，直接回 403（護欄 G4）。
 * 「拒絕」只適用於圍欄判定本身：精度不足（G3）拒收但訊息是「請重試」，
 * 不得比照瞬移偵測等啟發式一律拒絕，否則會出現「人在現場卻打不了卡」。
 */

// Info: (20260813 - Julian) 決定打卡歸屬工作日的容差，不是遲到寬限——只影響這筆算哪一天
const WORK_DATE_TOLERANCE_MINUTES = 180;

export class OutOfFenceError extends AppError {
  constructor(public readonly detail: IOutOfFencePayload) {
    super(API_ERRORS.FO_PUNCH_OUT_OF_FENCE);
    this.name = "OutOfFenceError";
  }
}

export class AttendancePunchService {
  constructor(
    private readonly punches: IAttendancePunchRepository,
    private readonly locations: IWorkLocationRepository,
    private readonly schedule: IAttendanceScheduleRepository,
    private readonly timeZone: string = DEMO_TIME_ZONE,
  ) {}

  public async listLocations(
    accountBookId: string,
  ): Promise<IWorkLocationSummary[]> {
    const locations = await this.locations.findByAccountBook(accountBookId);
    return locations.map((location) => ({
      id: location.id,
      code: location.code,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: location.radiusMeters,
    }));
  }

  /**
   * Info: (20260813 - Julian) 打卡。
   *
   * 時間由這裡產生（護欄 G1）：`punchedAt` 絕不接受任何 client 傳入值——
   * 竄改打卡時間是本系統價值最高的攻擊。
   */
  public async punch(
    employee: Employee,
    request: IPunchRequest,
  ): Promise<ITodayStatus> {
    const punchedAt = new Date();
    const accountBookId = employee.accountBookId;

    const candidates = await this.locations.findByAccountBook(accountBookId);
    if (candidates.length === 0) {
      // Info: (20260813 - Julian) 帳本還沒設定任何打卡地點：是設定問題，不是位置問題
      throw new AppError(API_ERRORS.NF_WORK_LOCATION);
    }

    this.assertAcceptableAccuracy(request.accuracyMeters);

    const nearest = findNearestGeofence(
      request.latitude,
      request.longitude,
      candidates,
    );
    this.assertInsideFence(nearest, employee);

    const match = nearest as IGeofenceMatch;
    const { workDate, minuteOfDay } = await this.resolvePunchWorkDate(
      employee,
      punchedAt,
    );

    const existing = await this.punches.findByEmployeeAndWorkDate(
      accountBookId,
      employee.id,
      workDate,
    );
    this.assertPunchableState(request.punchType, existing);

    // Info: (20260813 - Julian) id 先產生，因為它是加密 AAD 的一部分，加密必須在 insert 之前完成（ADR 018 §3）
    const id = randomUUID();
    const latitude = encryptPii(String(request.latitude), {
      table: HrPiiTable.ATTENDANCE_PUNCH,
      field: "latitudeCipher",
      recordId: id,
    });
    const longitude = encryptPii(String(request.longitude), {
      table: HrPiiTable.ATTENDANCE_PUNCH,
      field: "longitudeCipher",
      recordId: id,
    });

    await this.punches.create({
      id,
      accountBookId,
      employeeId: employee.id,
      punchType: request.punchType,
      verification: PunchVerification.GPS,
      punchedAt,
      workDate,
      workLocationId: match.location.id,
      latitudeCipher: latitude.cipher,
      longitudeCipher: longitude.cipher,
      accuracyMeters: request.accuracyMeters ?? null,
      distanceMeters: match.distanceMeters,
      piiAlgorithm: latitude.algorithm,
      piiKeyVersion: latitude.keyVersion,
    });

    logger.info(
      `[attendance] ${employee.employeeNo} ${request.punchType} at ${match.location.name} (${match.distanceMeters}m), workDate=${workDate}, minute=${minuteOfDay}`,
    );

    return this.buildTodayStatus(employee, workDate);
  }

  // Info: (20260813 - Julian) 今日狀態（A2）。無打卡也要回，前端據此顯示班別與按鈕
  public async getTodayStatus(employee: Employee): Promise<ITodayStatus> {
    const { workDate } = await this.resolvePunchWorkDate(employee, new Date());
    return this.buildTodayStatus(employee, workDate);
  }

  /**
   * Info: (20260813 - Julian) 護欄 G3：定位精度不足即拒收，擋的是「用 IP 粗定位假裝 GPS」。
   * 精度未回報時放行——部分裝置不提供這個值，一律擋會讓「打不了卡」變成裝置問題。
   */
  private assertAcceptableAccuracy(accuracyMeters?: number): void {
    if (accuracyMeters === undefined) return;
    if (accuracyMeters > DEMO_MAX_ACCURACY_METERS) {
      throw new AppError(API_ERRORS.VA_PUNCH_LOW_ACCURACY);
    }
  }

  /**
   * Info: (20260813 - Julian) 護欄 G4：圍欄外一律拒絕。
   * 丟具名的 `OutOfFenceError`（而非純 `AppError`）讓 route 把最近地點與距離
   * 一併回給前端（`jsonFailWithPayload`），方便使用者判斷自己離現場多遠。
   */
  private assertInsideFence(
    nearest: IGeofenceMatch | null,
    employee: Employee,
  ): void {
    if (nearest && nearest.inside) return;
    if (!nearest) throw new AppError(API_ERRORS.NF_WORK_LOCATION);

    logger.warn(
      `[attendance] ${employee.employeeNo} punched ${nearest.distanceMeters}m from ${nearest.location.name} (radius ${nearest.location.radiusMeters}m) — rejected`,
    );
    throw new OutOfFenceError({
      nearestLocationName: nearest.location.name,
      distanceMeters: nearest.distanceMeters,
      radiusMeters: nearest.location.radiusMeters,
    });
  }

  /**
   * Info: (20260813 - Julian) 狀態機：不能重複上班、不能未上班先下班；一天內多次進出（外出洽公）合法。
   *
   * `existing` 的 `punchType` 刻意寫成 `string` 而非 `PunchType`：Prisma 回字面量聯集，
   * `@/constants/attendance` 是 TS enum，enum 是名義型別、無法反向賦值，用 `string` 接才能兩邊互通。
   */
  private assertPunchableState(
    punchType: PunchType,
    existing: { punchType: string }[],
  ): void {
    const ins = existing.filter(
      (punch) => punch.punchType === PunchType.CLOCK_IN,
    ).length;
    const outs = existing.filter(
      (punch) => punch.punchType === PunchType.CLOCK_OUT,
    ).length;
    const onSite = ins > outs;

    if (punchType === PunchType.CLOCK_IN && onSite) {
      throw new AppError(API_ERRORS.VA_PUNCH_INVALID_STATE);
    }
    if (punchType === PunchType.CLOCK_OUT && !onSite) {
      throw new AppError(API_ERRORS.VA_PUNCH_INVALID_STATE);
    }
  }

  // Info: (20260813 - Julian) 候選只取「當地今日」與「當地昨日」——跨日班最多只會跨一天
  private async resolvePunchWorkDate(
    employee: Employee,
    punchedAt: Date,
  ): Promise<{ workDate: string; minuteOfDay: number }> {
    const today = toZonedParts(punchedAt, this.timeZone).isoDate;
    const workDates = [today, previousIsoDate(today)];

    const days = await this.schedule.findShiftDays(
      employee.accountBookId,
      employee.id,
      workDates,
    );

    return resolveWorkDate({
      punchedAt,
      timeZone: this.timeZone,
      toleranceMinutes: WORK_DATE_TOLERANCE_MINUTES,
      candidates: workDates.map((workDate) => {
        const day = days.find((item) => item.workDate === workDate);
        return { workDate, shift: day ? toShiftWindow(day) : null };
      }),
    });
  }

  private async buildTodayStatus(
    employee: Employee,
    workDate: string,
  ): Promise<ITodayStatus> {
    const [days, punches, locations] = await Promise.all([
      this.schedule.findShiftDays(employee.accountBookId, employee.id, [
        workDate,
      ]),
      this.punches.findByEmployeeAndWorkDate(
        employee.accountBookId,
        employee.id,
        workDate,
      ),
      this.locations.findByAccountBook(employee.accountBookId),
    ]);

    const day = days[0];
    const shift = day ? toShiftWindow(day) : null;

    const toMinute = (date: Date): number =>
      minutesFromWorkDateStart(date, workDate, this.timeZone);

    const ins = punches.filter(
      (punch) => punch.punchType === PunchType.CLOCK_IN,
    );
    const outs = punches.filter(
      (punch) => punch.punchType === PunchType.CLOCK_OUT,
    );
    const lastPunch = punches[punches.length - 1];

    return {
      employeeId: employee.id,
      employeeNo: employee.employeeNo,
      name: employee.name,
      workDate,
      shift,
      shiftName: day?.shiftPattern?.name ?? null,
      shiftKind: shift ? deriveShiftPatternKind(shift) : null,
      onSite: ins.length > outs.length,
      firstInMinute:
        ins.length > 0
          ? Math.min(...ins.map((p) => toMinute(p.punchedAt)))
          : null,
      lastOutMinute:
        outs.length > 0
          ? Math.max(...outs.map((p) => toMinute(p.punchedAt)))
          : null,
      workLocationName: this.nameOfLocation(
        locations,
        lastPunch?.workLocationId,
      ),
      // Info: (20260813 - Julian) 前端秒錶的校時基準，見 `ITodayStatus.serverNowIso`
      serverNowIso: new Date().toISOString(),
    };
  }

  private nameOfLocation(
    locations: WorkLocation[],
    workLocationId?: string,
  ): string | null {
    if (!workLocationId) return null;
    return (
      locations.find((location) => location.id === workLocationId)?.name ?? null
    );
  }
}

export const attendancePunchService = new AttendancePunchService(
  attendancePunchRepo,
  workLocationRepo,
  attendanceScheduleRepo,
);

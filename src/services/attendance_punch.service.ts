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
 * Info: (20260813 - Julian) 打卡主流程。
 *
 * ## 這支 service 的核心主張：到班的定義是「人在登記的地點」
 *
 * 座標未落入任何圍欄的打卡**不會寫進資料庫** —— 直接回 403。
 * 這不是「事後標記可疑」，圍欄就是「到班」這個事實的定義本身：
 * 人不在登記的地點，不是「到班了但有疑慮」，是到班這件事沒有發生，
 * 而系統不記錄一件沒發生的事（CLAUDE.md 的零捏造）。
 *
 * 它也是現場人數能成立的前提 —— 若允許圍欄外打卡，「工地上有幾個人」
 * 這個數字立刻失去意義，而那個數字在緊急疏散時是要拿來對人頭的。
 *
 * ## 一條必須劃清楚的界線
 *
 * 「拒絕」只適用於圍欄判定本身，不得外推到其他護欄：
 *
 * - **圍欄命中與否**：對「到班事實」的**定義** → 拒絕
 * - **定位精度不足**：**證據品質**不足以判定 → 拒絕，但訊息是「請重試」
 *   而不是「你不在現場」（那是「還無法判定他到了」，不是「判他沒到」）
 * - **瞬移偵測（G5，本期未實作）**：對紀錄可信度的**推測** → 收下並標記。
 *   人確實在圍欄內（否則早被擋掉），一個成立的現場事實不該被啟發式推測否認
 *
 * 「拒絕」一旦被當成通則，下一個護欄很容易被順手改成拒絕 ——
 * 而有誤判率的啟發式一旦拒絕，就會出現「員工真的到了工地卻打不了卡」，
 * 那才是這個系統唯一不能發生的事。
 */

/**
 * Info: (20260813 - Julian) 決定打卡歸屬工作日時的容差。
 *
 * **這不是寬限。** 它只影響「這筆打卡算哪一天」，不影響遲到早退的判定 ——
 * 提早 20 分鐘到工地的人，這一筆仍該歸屬今天，而不是變成沒有歸屬的孤兒。
 */
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
   * 時間由這裡產生（護欄 G1）：`punchedAt` 絕不接受任何 client 傳入值 ——
   * 竄改打卡時間是本系統價值最高的攻擊，只要傳得進來就永遠擋不住。
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

    /**
     * Info: (20260813 - Julian) id 先產生，因為它是加密 AAD 的一部分。
     * 加密發生在 insert 之前，等資料庫的 `@default(uuid())` 就來不及了（ADR 018 §3）。
     */
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
   * Info: (20260813 - Julian) 護欄 G3：定位精度不足即拒收。
   *
   * 這條擋的是「用 IP 粗定位假裝成 GPS」—— 那種來源的精度動輒數公里，
   * 落在任何一個圍欄裡都只是碰運氣。
   *
   * 精度未回報時放行：部分裝置不提供這個值，把它們一律擋掉會讓
   * 「打不了卡」變成裝置問題而不是位置問題。
   */
  private assertAcceptableAccuracy(accuracyMeters?: number): void {
    if (accuracyMeters === undefined) return;
    if (accuracyMeters > DEMO_MAX_ACCURACY_METERS) {
      throw new AppError(API_ERRORS.VA_PUNCH_LOW_ACCURACY);
    }
  }

  /**
   * Info: (20260813 - Julian) 護欄 G4：圍欄外一律拒絕。
   *
   * 丟具名的 `OutOfFenceError` 而不是純 `AppError`：route 需要把最近地點與距離
   * 一併回給前端（`jsonFailWithPayload`）。收到這個 403 的人正站在某處試圖上班，
   * 「我離大漢溪橋梁工區 340 公尺」比「系統說我不能打卡」有用得多。
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
   * Info: (20260813 - Julian) 狀態機：不能重複上班、不能未上班先下班。
   *
   * 只擋這兩種 —— 一天內多次進出（外出洽公）是合法的，判定引擎以
   * 「最早 IN / 最晚 OUT」收斂（母計畫 §7.4 的已知簡化）。
   *
   * `existing` 的 `punchType` 型別刻意寫成 `string` 而不是 `PunchType`：
   * Prisma 產生的是字面量聯集（`"CLOCK_IN" | "CLOCK_OUT"`），而 `@/constants/attendance`
   * 的是 TS string enum —— **後者可以寫進前者，但前者不能讀進後者**（TS 的 enum 是名義型別）。
   * 用 `string` 接、與 enum 成員比對，兩個方向都成立且不需要任何 `as` 轉型。
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

  /**
   * Info: (20260813 - Julian) 這一筆屬於哪一個工作日。
   *
   * 候選只取「當地今日」與「當地昨日」—— 跨日班最多只會跨一天，
   * 而多取一天只會增加誤判成前天的可能。
   */
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

import { describe, it, expect, beforeAll } from "@jest/globals";
import { randomBytes } from "crypto";
import {
  AttendancePunch,
  Employee,
  ShiftPattern,
  WorkLocation,
} from "@/generated";
import {
  AttendancePunchService,
  OutOfFenceError,
} from "@/services/attendance_punch.service";
import { PunchType, PunchVerification } from "@/constants/attendance";
import { HR_PII_KEY_BYTES, HrPiiTable } from "@/constants/hr_pii";
import { decryptPii } from "@/lib/hr_pii_crypto";
import { findOpenSession } from "@/lib/attendance_presence";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  IAttendancePunchInput,
  IAttendancePunchRepository,
} from "@/repositories/attendance_punch.repo";
import {
  IAttendanceScheduleRepository,
  IShiftDayWithPattern,
} from "@/repositories/attendance_schedule.repo";
import { IWorkLocationRepository } from "@/repositories/work_location.repo";

/**
 * Info: (20260813 - Julian) 打卡主流程。
 *
 * repository 全部以手寫假物件注入（同 `oauth.service` 的建構子注入慣例），
 * 因此這支測試不碰資料庫；但**加密走真的 `encryptPii`** ——
 * AAD 綁定寫錯不會在寫入時報錯，會在讀取時變成看起來像密文損毀的驗章失敗，
 * 那種錯誤只有往返一次才驗得出來。
 */

const ACCOUNT_BOOK_ID = "demo-book-public-works";

const employee = {
  id: "emp-5",
  employeeNo: "EMP005",
  name: "張文彬",
  accountBookId: ACCOUNT_BOOK_ID,
} as Employee;

// Info: (20260813 - Julian) 大漢溪橋梁工區，半徑 500 公尺
const SITE_A = {
  id: "loc-a",
  code: "LOC-A",
  name: "大漢溪橋梁改建工程 工區",
  latitude: 25.0,
  longitude: 121.45,
  radiusMeters: 500,
  accountBookId: ACCOUNT_BOOK_ID,
} as WorkLocation;

const SITE_DAY = {
  id: "shift-day",
  code: "SITE-DAY",
  name: "工地日班",
  windowStartMinute: 450,
  windowEndMinute: 1020,
  coreStartMinute: 450,
  coreEndMinute: 1020,
  requiredWorkMinutes: 480,
  breakMinutes: 60,
} as ShiftPattern;

// Info: (20260813 - Julian) 往南遠離：測試環境只有這一個地點，方向不影響結果，
// Info: (20260813 - Julian) 但與 geofence 測試保持一致，避免兩邊的心算基準不同
const metresAway = (metres: number): number =>
  SITE_A.latitude - metres / 111_320;

interface IHarness {
  service: AttendancePunchService;
  written: IAttendancePunchInput[];
}

const buildService = (options: {
  locations?: WorkLocation[];
  existing?: AttendancePunch[];
  shiftDay?: IShiftDayWithPattern | null;
}): IHarness => {
  const written: IAttendancePunchInput[] = [];

  const punches: IAttendancePunchRepository = {
    create: async (input) => {
      written.push(input);
      return input as unknown as AttendancePunch;
    },
    findByEmployeeAndWorkDate: async () => options.existing ?? [],
    // Info: (20260813 - Julian) 打卡流程用不到期間查詢；由判定矩陣的測試覆蓋
    findByWorkDateRange: async () => options.existing ?? [],
  };

  const locations: IWorkLocationRepository = {
    findByAccountBook: async () => options.locations ?? [SITE_A],
    findById: async () => options.locations?.[0] ?? SITE_A,
  };

  const schedule: IAttendanceScheduleRepository = {
    findShiftDays: async () => (options.shiftDay ? [options.shiftDay] : []),
    findShiftDaysInRange: async () =>
      options.shiftDay ? [options.shiftDay] : [],
    // Info: (20260813 - Julian) 打卡流程不寫排班；由排班 service 的測試覆蓋
    upsertShiftDay: async () => {
      throw new Error("not used by the punch flow");
    },
  };

  return {
    service: new AttendancePunchService(
      punches,
      locations,
      schedule,
      "Asia/Taipei",
    ),
    written,
  };
};

const punchAt = (latitude: number, punchType = PunchType.CLOCK_IN) => ({
  punchType,
  latitude,
  longitude: SITE_A.longitude,
  accuracyMeters: 20,
});

const madeClockIn = (workDate: string): AttendancePunch =>
  ({
    id: "punch-1",
    punchType: PunchType.CLOCK_IN,
    punchedAt: new Date(),
    workDate,
    workLocationId: SITE_A.id,
  }) as AttendancePunch;

describe("AttendancePunchService.punch", () => {
  beforeAll(() => {
    process.env.HR_PII_KEY_V1 =
      randomBytes(HR_PII_KEY_BYTES).toString("base64");
  });

  it("should accept a punch inside the fence and record the distance", async () => {
    const { service, written } = buildService({});

    await service.punch(employee, punchAt(metresAway(120)));

    expect(written).toHaveLength(1);
    expect(written[0].workLocationId).toBe(SITE_A.id);
    expect(written[0].verification).toBe(PunchVerification.GPS);
    expect(written[0].distanceMeters).toBeGreaterThan(100);
    expect(written[0].distanceMeters).toBeLessThan(140);
  });

  /**
   * Info: (20260813 - Julian) 核心主張：人不在登記的地點就打不了卡。
   * 圍欄外的打卡**不會寫進資料庫** —— 那正是現場人數之所以可信的原因。
   */
  it("should reject a punch outside every fence and write nothing", async () => {
    const { service, written } = buildService({});

    await expect(
      service.punch(employee, punchAt(metresAway(3200))),
    ).rejects.toThrow(OutOfFenceError);
    expect(written).toHaveLength(0);
  });

  // Info: (20260813 - Julian) 403 要帶得出最近地點與距離，讓站在現場的人知道該往哪走
  it("should tell the caller which location is nearest and how far it is", async () => {
    const { service } = buildService({});

    /**
     * Info: (20260814 - Julian) 不可寫成 `.catch(error => expect(...))`：
     * 那個結構在 `punch()` 成功 resolve 時**一個 expect 都不會跑**，
     * 於是把 `assertInsideFence` 整支註解掉，這條測試照樣是綠的。
     */
    const rejection = await service
      .punch(employee, punchAt(metresAway(3200)))
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(rejection).toBeInstanceOf(OutOfFenceError);
    const { detail } = rejection as OutOfFenceError;
    expect(detail.nearestLocationName).toBe(SITE_A.name);
    expect(detail.radiusMeters).toBe(500);
    expect(detail.distanceMeters).toBeGreaterThan(3000);
    // Info: (20260814 - Julian) 3200 公尺遠不可能是定位誤差，措辭必須是「你不在工區」
    expect(detail.withinAccuracyMargin).toBe(false);
  });

  /**
   * Info: (20260813 - Julian) 精度不足是「還無法判定他到了」，不是「判他沒到」。
   * 兩者都拒絕，但錯誤碼不同 —— 前端的文案完全不一樣。
   */
  it("should reject a low accuracy fix with its own error, not as out of fence", async () => {
    const { service } = buildService({});

    await expect(
      service.punch(employee, {
        ...punchAt(SITE_A.latitude),
        accuracyMeters: 5_000,
      }),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_PUNCH_LOW_ACCURACY.code,
    });
  });

  // Info: (20260813 - Julian) 未回報精度的裝置照常放行：那是裝置問題，不是位置問題
  it("should accept a punch that reports no accuracy at all", async () => {
    const { service, written } = buildService({});

    await service.punch(employee, {
      punchType: PunchType.CLOCK_IN,
      latitude: SITE_A.latitude,
      longitude: SITE_A.longitude,
    });

    expect(written[0].accuracyMeters).toBeNull();
  });

  it("should fail when the account book has no work location configured", async () => {
    const { service } = buildService({ locations: [] });

    await expect(
      service.punch(employee, punchAt(SITE_A.latitude)),
    ).rejects.toMatchObject({ apiCode: API_ERRORS.NF_WORK_LOCATION.code });
  });

  /**
   * Info: (20260813 - Julian) `punchedAt` 由伺服器產生（護欄 G1）。
   * 這條測的是「client 送什麼都不影響」—— schema 根本沒有這個欄位，
   * 但這裡再確認一次寫進去的時間確實貼近現在。
   */
  it("should stamp the punch with server time", async () => {
    const { service, written } = buildService({});
    const before = Date.now();

    await service.punch(employee, punchAt(SITE_A.latitude));

    expect(written[0].punchedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(written[0].punchedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  /**
   * Info: (20260813 - Julian) 加密往返：AAD 綁定 `表名:列id:欄位名:代次`。
   *
   * 寫錯 AAD 不會在寫入時報錯，會在**讀取時**變成 GCM 驗章失敗 ——
   * 而那個錯誤看起來像密文損毀，是最難查的一種。所以在這裡就解一次。
   */
  it("should encrypt the coordinates so they decrypt back with the same AAD", async () => {
    const { service, written } = buildService({});

    await service.punch(employee, punchAt(SITE_A.latitude));

    const record = written[0];
    const latitude = decryptPii(
      record.latitudeCipher,
      {
        table: HrPiiTable.ATTENDANCE_PUNCH,
        field: "latitudeCipher",
        recordId: record.id,
      },
      record.piiKeyVersion,
    );

    expect(Number(latitude)).toBeCloseTo(SITE_A.latitude, 6);
  });

  // Info: (20260813 - Julian) 密文不可與明文相同，也不可洩漏座標的字面值
  it("should not store the coordinates in the clear", async () => {
    const { service, written } = buildService({});

    await service.punch(employee, punchAt(SITE_A.latitude));

    expect(written[0].latitudeCipher).not.toContain("25.0");
    expect(written[0].longitudeCipher).not.toContain("121.45");
  });
});

describe("AttendancePunchService 狀態機", () => {
  beforeAll(() => {
    process.env.HR_PII_KEY_V1 =
      randomBytes(HR_PII_KEY_BYTES).toString("base64");
  });

  const shiftDay = {
    workDate: "2026-08-13",
    shiftPattern: SITE_DAY,
  } as IShiftDayWithPattern;

  it("should refuse a second clock-in while already on site", async () => {
    const { service, written } = buildService({
      shiftDay,
      existing: [madeClockIn(shiftDay.workDate)],
    });

    await expect(
      service.punch(employee, punchAt(SITE_A.latitude, PunchType.CLOCK_IN)),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_PUNCH_INVALID_STATE.code,
    });
    expect(written).toHaveLength(0);
  });

  it("should refuse a clock-out before any clock-in", async () => {
    const { service } = buildService({ shiftDay, existing: [] });

    await expect(
      service.punch(employee, punchAt(SITE_A.latitude, PunchType.CLOCK_OUT)),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("should accept a clock-out after a clock-in", async () => {
    const { service, written } = buildService({
      shiftDay,
      existing: [madeClockIn(shiftDay.workDate)],
    });

    await service.punch(
      employee,
      punchAt(SITE_A.latitude, PunchType.CLOCK_OUT),
    );

    expect(written[0].punchType).toBe(PunchType.CLOCK_OUT);
  });

  /**
   * Info: (20260817 - Luphia) 「在不在現場」只能有一個答案（檢查清單 §2.1）。
   *
   * `[IN, IN, OUT]` 走 API 的正常路徑產不出來（第二張上班卡會被擋），但打卡是
   * 先查後改、`AttendancePunch` 沒有可用的唯一鍵，兩台裝置同時送就寫得進去。
   * 舊的 `上班卡數 > 下班卡數` 在這個序列上說「還在班」（2 > 1），
   * 而現場名單的時序判斷說「已離場」（最後一筆是 OUT）——
   * 同一個人在兩個畫面上狀態相反，而兩邊都沒有錯誤。
   *
   * 收斂到 `isOnSite` 之後兩邊都答「已離場」。這條測試守的是那個一致性，
   * 不是「競態已被消除」（它沒有，見 service 的 ToDo）。
   */
  const punchRow = (punchType: PunchType, isoTime: string): AttendancePunch =>
    ({
      id: `punch-${isoTime}`,
      punchType,
      punchedAt: new Date(isoTime),
      workDate: "2026-08-13",
      workLocationId: SITE_A.id,
    }) as AttendancePunch;

  it("競態寫入的重複上班卡：時序判斷勝過計數，兩邊都說已離場", async () => {
    const raced = [
      punchRow(PunchType.CLOCK_IN, "2026-08-13T00:30:00.000Z"),
      punchRow(PunchType.CLOCK_IN, "2026-08-13T00:30:01.000Z"),
      punchRow(PunchType.CLOCK_OUT, "2026-08-13T09:00:00.000Z"),
    ];

    const { service } = buildService({ shiftDay, existing: raced });
    const status = await service.getTodayStatus(employee);

    // Info: (20260817 - Luphia) 計數會回 true（2 > 1）；時序回 false
    expect(status.onSite).toBe(false);
    // Info: (20260817 - Luphia) 與現場名單同源：對同一組打卡，findOpenSession 也回 null
    expect(
      findOpenSession(
        raced.map((punch) => ({
          punchType: punch.punchType as PunchType,
          minuteOfDay: punch.punchedAt.getTime() / 60_000,
          workLocationId: punch.workLocationId,
        })),
      ),
    ).toBeNull();
  });

  it("競態寫入之後仍然打得下班卡（狀態機不會把人鎖在班上）", async () => {
    const { service, written } = buildService({
      shiftDay,
      existing: [
        punchRow(PunchType.CLOCK_IN, "2026-08-13T00:30:00.000Z"),
        punchRow(PunchType.CLOCK_IN, "2026-08-13T00:30:01.000Z"),
      ],
    });

    await service.punch(
      employee,
      punchAt(SITE_A.latitude, PunchType.CLOCK_OUT),
    );

    expect(written[0].punchType).toBe(PunchType.CLOCK_OUT);
  });
});

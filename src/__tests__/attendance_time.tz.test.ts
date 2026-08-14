import { describe, it, expect } from "@jest/globals";
import {
  minutesFromWorkDateStart,
  previousIsoDate,
  resolveWorkDate,
  toZonedParts,
} from "@/lib/utils/attendance_time";
import { IShiftWindow } from "@/interfaces/attendance";
import { zonedIsoMonth } from "@/lib/utils/attendance_result_view";

/**
 * Info: (20260813 - Julian) 時區換算。**由 `npm run test:tz` 在 America/New_York 下執行。**
 *
 * 這支測試要證明的不是「換算對」，而是**換算與行程時區無關** ——
 * 所有函式都收明確的 `timeZone` 參數，因此在紐約跑出來的結果必須與台北一模一樣。
 * 一旦有人在實作裡用了 `date.getHours()` 之類的本機時間 API，
 * 這支測試會在紐約的機器上紅掉，而在台北的開發機上永遠看不出來。
 *
 * 檔名後綴 `.tz.test.ts` 讓它同時被 `scripts/jest_tz.mjs` 撿到、
 * 被 `jest.config.mjs` 的預設執行排除（見那兩個檔案的說明）。
 */

const TAIPEI = "Asia/Taipei";

// Info: (20260813 - Julian) 工地日班 07:30–17:00
const SITE_DAY: IShiftWindow = {
  windowStartMinute: 450,
  windowEndMinute: 1020,
  coreStartMinute: 450,
  coreEndMinute: 1020,
  requiredWorkMinutes: 480,
  breakMinutes: 60,
};

// Info: (20260813 - Julian) 夜間施工班 20:00 → 次日 05:00（1200 → 1740）
const SITE_NIGHT: IShiftWindow = {
  windowStartMinute: 1200,
  windowEndMinute: 1740,
  coreStartMinute: 1200,
  coreEndMinute: 1740,
  requiredWorkMinutes: 450,
  breakMinutes: 60,
};

describe("toZonedParts", () => {
  /**
   * Info: (20260813 - Julian) 台北 UTC+8：UTC 的 23:00 已經是台北的隔天早上。
   * 這一條若壞掉，所有跨日的歸屬都會錯一天。
   */
  it("should read the wall clock of the requested zone, not the host", () => {
    const instant = new Date("2026-08-12T23:10:00Z");

    expect(toZonedParts(instant, TAIPEI)).toEqual({
      isoDate: "2026-08-13",
      minuteOfDay: 7 * 60 + 10,
    });
  });

  it("should report midnight as minute zero, not 1440", () => {
    const instant = new Date("2026-08-12T16:00:00Z");

    expect(toZonedParts(instant, TAIPEI)).toEqual({
      isoDate: "2026-08-13",
      minuteOfDay: 0,
    });
  });

  // Info: (20260813 - Julian) 同一個瞬間、不同時區，答案必須跟著時區走
  it("should give different answers for different zones at the same instant", () => {
    const instant = new Date("2026-08-12T23:10:00Z");

    expect(toZonedParts(instant, TAIPEI).isoDate).toBe("2026-08-13");
    expect(toZonedParts(instant, "UTC").isoDate).toBe("2026-08-12");
  });
});

describe("previousIsoDate", () => {
  it("should step back one calendar day", () => {
    expect(previousIsoDate("2026-08-13")).toBe("2026-08-12");
  });

  // Info: (20260813 - Julian) 月初與年初：純日曆運算，不該依賴任何時區
  it("should step across a month boundary", () => {
    expect(previousIsoDate("2026-08-01")).toBe("2026-07-31");
  });

  it("should step across a year boundary", () => {
    expect(previousIsoDate("2026-01-01")).toBe("2025-12-31");
  });

  it("should handle a leap day", () => {
    expect(previousIsoDate("2028-03-01")).toBe("2028-02-29");
  });
});

describe("minutesFromWorkDateStart", () => {
  it("should count minutes from local midnight of the given work date", () => {
    const instant = new Date("2026-08-12T23:47:00Z");

    expect(minutesFromWorkDateStart(instant, "2026-08-13", TAIPEI)).toBe(
      7 * 60 + 47,
    );
  });

  /**
   * Info: (20260813 - Julian) 跨日班的核心：次日 05:03 相對於前一日的工作日
   * 是 1743 分，而不是 303 分。這個 >= 1440 的表示法就是跨日的全部機制。
   */
  it("should exceed 1440 for a punch that belongs to the previous work date", () => {
    const instant = new Date("2026-08-12T21:03:00Z");

    expect(minutesFromWorkDateStart(instant, "2026-08-12", TAIPEI)).toBe(
      1440 + 5 * 60 + 3,
    );
  });

  it("should go negative for a punch before the work date started", () => {
    const instant = new Date("2026-08-12T15:00:00Z");

    expect(minutesFromWorkDateStart(instant, "2026-08-13", TAIPEI)).toBe(-60);
  });
});

describe("resolveWorkDate", () => {
  const candidates = (
    todayShift: IShiftWindow | null,
    yesterdayShift: IShiftWindow | null,
  ) => [
    { workDate: "2026-08-13", shift: todayShift },
    { workDate: "2026-08-12", shift: yesterdayShift },
  ];

  it("should assign a morning punch to today", () => {
    const punchedAt = new Date("2026-08-12T23:28:00Z");

    expect(
      resolveWorkDate({
        punchedAt,
        timeZone: TAIPEI,
        candidates: candidates(SITE_DAY, SITE_DAY),
        toleranceMinutes: 180,
      }),
    ).toEqual({ workDate: "2026-08-13", minuteOfDay: 7 * 60 + 28 });
  });

  /**
   * Info: (20260813 - Julian) 夜班的下班打卡：台北時間 8/13 05:03，
   * 但它屬於 8/12 的夜間施工班。以日曆日分組會讓這個人每天被判成
   * 「上班沒下班」加「下班沒上班」兩筆異常。
   */
  it("should assign an early-morning punch to yesterday's night shift", () => {
    const punchedAt = new Date("2026-08-12T21:03:00Z");

    expect(
      resolveWorkDate({
        punchedAt,
        timeZone: TAIPEI,
        candidates: candidates(null, SITE_NIGHT),
        toleranceMinutes: 180,
      }),
    ).toEqual({ workDate: "2026-08-12", minuteOfDay: 1440 + 5 * 60 + 3 });
  });

  /**
   * Info: (20260814 - Julian) 上一條刻意讓今日沒有班別，歧義從一開始就不存在 ——
   * 而輪班（昨天夜班、今天早班）才是工地的常態，也是這個函式唯一會判錯的情況。
   *
   * 台北 8/13 05:00 在 8/12 夜班是**窗內**（1740），在 8/13 早班靠 450−180 的容差也搆得到。
   * 取「陣列第一個命中」會判給 8/13，接著 `assertPunchableState` 看 8/13 沒有上班卡，
   * 這個人的下班卡會被 `VA_PUNCH_INVALID_STATE` 拒絕 —— **他根本下不了班**，
   * 而 8/12 永遠停在 `MISSING_CLOCK_OUT`。窗內優先於容差就是為了這條。
   */
  it("should prefer an exact window hit over another day's tolerance hit", () => {
    const punchedAt = new Date("2026-08-12T21:00:00Z");

    expect(
      resolveWorkDate({
        punchedAt,
        timeZone: TAIPEI,
        candidates: candidates(SITE_DAY, SITE_NIGHT),
        toleranceMinutes: 180,
      }),
    ).toEqual({ workDate: "2026-08-12", minuteOfDay: 1440 + 5 * 60 });
  });

  // Info: (20260814 - Julian) 兩邊都只靠容差搆到時取離窗最近的，不是陣列第一個
  it("should pick the nearest window when only tolerance hits exist", () => {
    // Info: (20260814 - Julian) 台北 8/13 03:00：離 8/12 夜班窗迄 1740 有 60 分，離 8/13 早班窗起 450 有 270 分
    const punchedAt = new Date("2026-08-12T19:00:00Z");

    expect(
      resolveWorkDate({
        punchedAt,
        timeZone: TAIPEI,
        candidates: candidates(SITE_DAY, SITE_NIGHT),
        toleranceMinutes: 300,
      }),
    ).toEqual({ workDate: "2026-08-12", minuteOfDay: 1440 + 3 * 60 });
  });

  // Info: (20260813 - Julian) 夜班的上班打卡在同一天晚上，仍屬於當天
  it("should assign the evening start of a night shift to that same day", () => {
    const punchedAt = new Date("2026-08-12T12:05:00Z");

    expect(
      resolveWorkDate({
        punchedAt,
        timeZone: TAIPEI,
        candidates: [{ workDate: "2026-08-12", shift: SITE_NIGHT }],
        toleranceMinutes: 180,
      }),
    ).toEqual({ workDate: "2026-08-12", minuteOfDay: 1200 + 5 });
  });

  /**
   * Info: (20260813 - Julian) 無排班時歸到當地今日。
   * 那不是猜測 —— 判定引擎看到 `NO_SCHEDULE` 就不會下任何結論，
   * 沒有比較基準就不會有錯誤的異常。
   */
  it("should fall back to the local calendar day when nothing is scheduled", () => {
    const punchedAt = new Date("2026-08-12T23:28:00Z");

    expect(
      resolveWorkDate({
        punchedAt,
        timeZone: TAIPEI,
        candidates: candidates(null, null),
        toleranceMinutes: 180,
      }).workDate,
    ).toBe("2026-08-13");
  });

  // Info: (20260813 - Julian) 容差只影響歸屬，不影響遲到判定：早到 40 分仍算今天
  it("should keep an early arrival on the same work date", () => {
    const punchedAt = new Date("2026-08-12T22:50:00Z");

    expect(
      resolveWorkDate({
        punchedAt,
        timeZone: TAIPEI,
        candidates: candidates(SITE_DAY, SITE_DAY),
        toleranceMinutes: 180,
      }),
    ).toEqual({ workDate: "2026-08-13", minuteOfDay: 6 * 60 + 50 });
  });
});

/**
 * Info: (20260814 - Julian) 畫面預設月份的時區正確性。
 *
 * 這支測試由 `npm run test:tz` 在 America/New_York 下跑，所以它同時證明兩件事：
 * 換算結果不依賴行程時區，且不是 UTC。原本的寫法是
 * `isoMonthOf(new Date().toISOString())` —— 台北 9/1 07:30 會回上個月。
 */
describe("zonedIsoMonth", () => {
  it("台北月初凌晨算的是台北的月份，不是 UTC 的上個月", () => {
    // Info: (20260814 - Julian) 台北 2026-09-01 07:30 = 2026-08-31T23:30Z
    expect(zonedIsoMonth(new Date("2026-08-31T23:30:00Z"), TAIPEI)).toBe(
      "2026-09",
    );
  });

  it("台北月底深夜還算在當月", () => {
    // Info: (20260814 - Julian) 台北 2026-08-31 23:30 = 2026-08-31T15:30Z
    expect(zonedIsoMonth(new Date("2026-08-31T15:30:00Z"), TAIPEI)).toBe(
      "2026-08",
    );
  });
});

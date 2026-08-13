import { describe, it, expect } from "@jest/globals";
import {
  minutesFromWorkDateStart,
  previousIsoDate,
  resolveWorkDate,
  toZonedParts,
} from "@/lib/utils/attendance_time";
import { IShiftWindow } from "@/interfaces/attendance";

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

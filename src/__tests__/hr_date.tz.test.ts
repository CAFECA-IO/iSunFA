import { describe, it, expect, afterAll, beforeAll } from "@jest/globals";
import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInFullYears,
  isSameMonth,
  parseIsoDate,
  toIsoDate,
  toMonthKey,
} from "@/lib/utils/hr_date";

/**
 * Info: (20260811 - Julian) `hr_date.ts` 的檔頭與函式註解對三件事做了很具體的主張：
 * 美洲時區會少一天、1/31 加一個月不該變 3/3、DST 的 23 小時日會讓 `Math.floor` 少算一天。
 * 三條都是「今天對、下次重構就悄悄壞掉」的典型，而它們是試用期滿日、
 * 到職週年、文件到期日的計算基礎 —— 算錯不會噴錯，只會安靜地差一天。
 *
 * ## 為什麼整支測試跑在 America/New_York
 *
 * 前兩條主張裡最重要的一句是「**而且在台灣測不出來**」。
 * 在 UTC+8 跑，`new Date("2026-08-10")` 解析出來的 UTC 午夜換算成本地時間還是同一天，
 * bug 完全不會現形 —— 這正是它危險的原因。因此這裡強制把時區切到 UTC 以西，
 * 讓「本地時區與 UTC 不同日」與 DST 兩件事都真的發生。
 *
 * Node 會在每次 Date 運算時重讀 `process.env.TZ`（v13 起），所以執行期切換有效；
 * `afterAll` 還原，避免污染同一個 worker 裡的其他測試檔。
 */
describe("hr_date", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  describe("parseIsoDate", () => {
    // Info: (20260811 - Julian) 先釘住前提：原生解析在此時區確實會退一天，否則下面那條測試就失去意義
    it("should demonstrate the native parsing bug this function exists to avoid", () => {
      expect(new Date("2026-08-10").getDate()).toBe(9);
    });

    it("should parse to local midnight without shifting the day", () => {
      const parsed = parseIsoDate("2026-08-10");
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(7);
      expect(parsed.getDate()).toBe(10);
      expect(parsed.getHours()).toBe(0);
    });

    it("should ignore a time portion and keep the calendar day", () => {
      expect(toIsoDate(parseIsoDate("2026-08-10T23:59:59.999Z"))).toBe(
        "2026-08-10",
      );
    });

    // Info: (20260811 - Julian) 到職日 → 顯示 → 再存回，是最常見的往返路徑，不該掉一天
    it("should round-trip through toIsoDate", () => {
      ["2026-01-01", "2026-02-28", "2026-12-31", "2026-03-08"].forEach(
        (iso) => {
          expect(toIsoDate(parseIsoDate(iso))).toBe(iso);
        },
      );
    });
  });

  describe("toIsoDate / toMonthKey", () => {
    it("should zero-pad to a fixed width", () => {
      expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
      expect(toMonthKey(new Date(2026, 0, 5))).toBe("2026-01");
      expect(toMonthKey(new Date(2026, 11, 31))).toBe("2026-12");
    });
  });

  describe("addMonths", () => {
    /**
     * Info: (20260811 - Julian) 註解主張的核心：naive `setMonth` 會把 1/31 加一個月變成 3/3。
     * 這裡先示範原生行為，再確認 addMonths 夾到了 2/28 ——
     * 只斷言結果是 2/28 的話，看不出來這個函式在防什麼。
     */
    it("should clamp to the last day instead of overflowing into the next month", () => {
      const naive = new Date(2026, 0, 31);
      naive.setMonth(naive.getMonth() + 1);
      expect(toIsoDate(naive)).toBe("2026-03-03");

      expect(toIsoDate(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-28");
    });

    it("should clamp to February 29 in a leap year", () => {
      expect(toIsoDate(addMonths(new Date(2028, 0, 31), 1))).toBe("2028-02-29");
    });

    // Info: (20260811 - Julian) 試用期 3 個月：11/30 到職的人應在 2/28 滿期，不是 3/2
    it("should clamp across a three-month probation window", () => {
      expect(toIsoDate(addMonths(new Date(2026, 10, 30), 3))).toBe(
        "2027-02-28",
      );
    });

    it("should not clamp when the day exists in the target month", () => {
      expect(toIsoDate(addMonths(new Date(2026, 0, 15), 3))).toBe("2026-04-15");
    });

    it("should roll the year over in both directions", () => {
      expect(toIsoDate(addMonths(new Date(2026, 10, 15), 3))).toBe(
        "2027-02-15",
      );
      expect(toIsoDate(addMonths(new Date(2026, 1, 15), -3))).toBe(
        "2025-11-15",
      );
    });
  });

  describe("differenceInDays", () => {
    /**
     * Info: (20260811 - Julian) 註解主張的核心：DST 讓某些「一天」只有 23 小時，
     * 直接除會得到 0.958 天，`Math.floor` 少算一天。
     *
     * 2026-03-08 是美國春季調快日，該日只有 23 小時。這一天差一天的後果是
     * 「還有 0 天到期」被算成「已經過期」，或反過來 —— 而全年只有兩天會踩到，
     * 所以不會有人在日常使用中發現。
     */
    it("should count a 23-hour DST day as one full day", () => {
      const from = parseIsoDate("2026-03-08");
      const to = parseIsoDate("2026-03-09");
      expect((to.getTime() - from.getTime()) / 3_600_000).toBe(23);
      expect(Math.floor((to.getTime() - from.getTime()) / 86_400_000)).toBe(0);
      expect(differenceInDays(from, to)).toBe(1);
    });

    // Info: (20260811 - Julian) 秋季調慢的 25 小時日是反方向，不該被算成 2 天
    it("should count a 25-hour DST day as one full day", () => {
      const from = parseIsoDate("2026-11-01");
      const to = parseIsoDate("2026-11-02");
      expect((to.getTime() - from.getTime()) / 3_600_000).toBe(25);
      expect(differenceInDays(from, to)).toBe(1);
    });

    it("should span a DST transition inside a longer range", () => {
      expect(
        differenceInDays(
          parseIsoDate("2026-03-01"),
          parseIsoDate("2026-04-01"),
        ),
      ).toBe(31);
    });

    it("should return zero for the same day and go negative backwards", () => {
      const day = parseIsoDate("2026-08-10");
      expect(differenceInDays(day, day)).toBe(0);
      expect(differenceInDays(parseIsoDate("2026-08-11"), day)).toBe(-1);
    });

    // Info: (20260811 - Julian) 兩端都歸零到當日，所以帶時分秒不影響結果
    it("should ignore the time of day at both ends", () => {
      expect(
        differenceInDays(
          new Date(2026, 7, 10, 23, 59),
          new Date(2026, 7, 11, 0, 1),
        ),
      ).toBe(1);
    });
  });

  describe("differenceInFullYears", () => {
    const hire = parseIsoDate("2026-08-10");

    // Info: (20260811 - Julian) 到職週年：差一天都不算滿，這是特休年資的判斷基礎
    it("should not round up before the anniversary", () => {
      expect(differenceInFullYears(hire, parseIsoDate("2027-08-09"))).toBe(0);
      expect(differenceInFullYears(hire, parseIsoDate("2027-08-10"))).toBe(1);
      expect(differenceInFullYears(hire, parseIsoDate("2027-08-11"))).toBe(1);
    });

    it("should handle an earlier month in the same year", () => {
      expect(differenceInFullYears(hire, parseIsoDate("2027-07-31"))).toBe(0);
      expect(differenceInFullYears(hire, parseIsoDate("2028-09-01"))).toBe(2);
    });

    /**
     * Info: (20260811 - Julian) 2/29 出生／到職的人，非閏年沒有週年日。
     * 現行實作在 2027-02-28 回 0（尚未滿週年），3/1 才進位 —— 釘住這個行為，
     * 日後若要改成「非閏年以 2/28 為週年」，這條測試會逼人明確地改它，
     * 而不是在重構時無聲地翻過去。
     */
    it("should document the February 29 anniversary behaviour", () => {
      const leapDay = parseIsoDate("2028-02-29");
      expect(differenceInFullYears(leapDay, parseIsoDate("2029-02-28"))).toBe(
        0,
      );
      expect(differenceInFullYears(leapDay, parseIsoDate("2029-03-01"))).toBe(
        1,
      );
    });
  });

  describe("addDays", () => {
    it("should cross a month and a year boundary", () => {
      expect(toIsoDate(addDays(parseIsoDate("2026-01-31"), 1))).toBe(
        "2026-02-01",
      );
      expect(toIsoDate(addDays(parseIsoDate("2026-12-31"), 1))).toBe(
        "2027-01-01",
      );
      expect(toIsoDate(addDays(parseIsoDate("2026-03-01"), -1))).toBe(
        "2026-02-28",
      );
    });

    // Info: (20260811 - Julian) 跨過 DST 調快日仍應是日曆上的隔天，不是 23 小時後的同一天
    it("should stay on the calendar grid across a DST transition", () => {
      expect(toIsoDate(addDays(parseIsoDate("2026-03-07"), 2))).toBe(
        "2026-03-09",
      );
    });

    it("should not mutate the input", () => {
      const original = parseIsoDate("2026-08-10");
      addDays(original, 5);
      expect(toIsoDate(original)).toBe("2026-08-10");
    });
  });

  describe("isSameMonth", () => {
    it("should compare year and month together", () => {
      expect(
        isSameMonth(parseIsoDate("2026-08-01"), parseIsoDate("2026-08-31")),
      ).toBe(true);
      expect(
        isSameMonth(parseIsoDate("2026-08-31"), parseIsoDate("2026-09-01")),
      ).toBe(false);
      // Info: (20260811 - Julian) 同月不同年不算同月 —— 只比 getMonth() 的實作會在這裡出錯
      expect(
        isSameMonth(parseIsoDate("2025-08-10"), parseIsoDate("2026-08-10")),
      ).toBe(false);
    });
  });
});

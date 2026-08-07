import { describe, expect, it } from "@jest/globals";
import {
  FIVE_HOURS_SEC,
  WEEK_ANCHOR_EPOCH_SEC,
  WEEK_SEC,
} from "@/constants/subscription_quota";
import {
  getResetAt5h,
  getResetAtWeek,
  getWindowKey5h,
  getWindowKeyWeek,
} from "@/lib/quota/window";

/**
 * Info: (20260807 - Luphia) 訂閱額度視窗純函式單測（設計書 §4、P0 驗收）。
 * 視窗數學是計費的決定論核心：邊界差一秒就是「多扣一輪額度」的財務事故，
 * 因此邊界、錨點語意與 Fail Fast 全部逐一釘死。
 */

describe("quota window math", () => {
  describe("getWindowKey5h", () => {
    it("returns the floor of nowSec / 18000", () => {
      // Info: (20260807 - Luphia) 錨點當下：1767542400 / 18000 = 98196.8 → 98196
      expect(getWindowKey5h(WEEK_ANCHOR_EPOCH_SEC)).toBe(98196);
    });

    it("keeps the same key until the last second of the window", () => {
      const windowStart = 98200 * FIVE_HOURS_SEC;
      expect(getWindowKey5h(windowStart)).toBe(98200);
      expect(getWindowKey5h(windowStart + FIVE_HOURS_SEC - 1)).toBe(98200);
      expect(getWindowKey5h(windowStart + FIVE_HOURS_SEC)).toBe(98201);
    });
  });

  describe("getResetAt5h", () => {
    it("returns the exact start of the next window", () => {
      const windowStart = 98200 * FIVE_HOURS_SEC;
      expect(getResetAt5h(windowStart)).toBe(windowStart + FIVE_HOURS_SEC);
      expect(getResetAt5h(windowStart + FIVE_HOURS_SEC - 1)).toBe(
        windowStart + FIVE_HOURS_SEC,
      );
    });

    it("is always in the future and within one window length", () => {
      const samples = [
        WEEK_ANCHOR_EPOCH_SEC,
        WEEK_ANCHOR_EPOCH_SEC + 12345,
        WEEK_ANCHOR_EPOCH_SEC + 987654,
      ];
      samples.forEach((nowSec) => {
        const resetAt = getResetAt5h(nowSec);
        expect(resetAt).toBeGreaterThan(nowSec);
        expect(resetAt - nowSec).toBeLessThanOrEqual(FIVE_HOURS_SEC);
      });
    });
  });

  describe("getWindowKeyWeek", () => {
    it("returns 0 for the entire anchor week and 1 from the next Monday", () => {
      expect(getWindowKeyWeek(WEEK_ANCHOR_EPOCH_SEC)).toBe(0);
      expect(getWindowKeyWeek(WEEK_ANCHOR_EPOCH_SEC + WEEK_SEC - 1)).toBe(0);
      expect(getWindowKeyWeek(WEEK_ANCHOR_EPOCH_SEC + WEEK_SEC)).toBe(1);
    });

    it("matches the real calendar: 2026-08-07 12:00 (UTC+8) is in week 30", () => {
      // Info: (20260807 - Luphia) 1786075200 = 2026-08-07T04:00:00Z = 2026-08-07 12:00 台北
      expect(getWindowKeyWeek(1786075200)).toBe(30);
    });
  });

  describe("getResetAtWeek", () => {
    it("resets at the next Monday 00:00 Asia/Taipei", () => {
      // Info: (20260807 - Luphia) 1786291200 = 2026-08-09T16:00:00Z = 2026-08-10（一）00:00 台北
      expect(getResetAtWeek(1786075200)).toBe(1786291200);
      expect(getResetAtWeek(WEEK_ANCHOR_EPOCH_SEC)).toBe(
        WEEK_ANCHOR_EPOCH_SEC + WEEK_SEC,
      );
    });

    it("is always in the future and within one week", () => {
      const nowSec = WEEK_ANCHOR_EPOCH_SEC + 3 * 86400 + 7200;
      const resetAt = getResetAtWeek(nowSec);
      expect(resetAt).toBeGreaterThan(nowSec);
      expect(resetAt - nowSec).toBeLessThanOrEqual(WEEK_SEC);
    });
  });

  describe("fail fast on invalid timestamps", () => {
    const invalidInputs: number[] = [
      WEEK_ANCHOR_EPOCH_SEC - 1, // Info: (20260807 - Luphia) 早於錨點 = 時鐘錯誤
      0,
      -1,
      WEEK_ANCHOR_EPOCH_SEC + 0.5, // Info: (20260807 - Luphia) 非整數秒
      Number.NaN,
    ];

    it("throws in every window function", () => {
      invalidInputs.forEach((nowSec) => {
        expect(() => getWindowKey5h(nowSec)).toThrow();
        expect(() => getWindowKeyWeek(nowSec)).toThrow();
        expect(() => getResetAt5h(nowSec)).toThrow();
        expect(() => getResetAtWeek(nowSec)).toThrow();
      });
    });
  });
});

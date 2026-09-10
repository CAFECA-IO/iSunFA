import { describe, it, expect } from "@jest/globals";
import { profileChangeTiming } from "@/lib/utils/salary_profile_change_timing";

/**
 * Info: (20260910 - Luphia) 調薪的「回溯 / 預先」標籤（#6790 review）。
 *
 * ## 為什麼釘在 `America/New_York`
 *
 * `recordedAt` 是資料庫的時間戳（UTC），`effectiveYear` / `effectiveMonth`
 * 是存成整數的日曆年月。原本的實作用 `getFullYear()` / `getMonth()`
 * ——**本地時間**——讀前者去跟後者比。
 *
 * 那個錯誤在 UTC 與 UTC+08:00 都測不出來：東八區只會把時間往前推，
 * 跨月的方向與西半球相反，而多數時刻兩者落在同一個月。只有 UTC 以西、
 * 而且剛好在月初那幾個小時，月份才會退一格。
 *
 * 標籤翻面的代價：「回溯登記」（事後補的）與「預先排定」（先講好的）
 * 對稽核的意義相反，而畫面不會有任何跡象顯示它算錯了。
 *
 * 樣板同 `salary_coverage.tz.test.ts`。
 */

const at = (iso: string): number => Date.parse(iso) / 1000;

describe("生效月份與記錄月份相同 → 不標", () => {
  it("同月的一般情形", () => {
    expect(
      profileChangeTiming({
        effectiveYear: 2026,
        effectiveMonth: 4,
        recordedAt: at("2026-04-15T09:00:00.000Z"),
      }),
    ).toBeNull();
  });

  /**
   * Info: (20260910 - Luphia) **這一條就是那個缺陷。**
   *
   * 2026-04-01T02:00Z 在紐約是 3/31 22:00。用本地時間讀會算成三月，
   * 於是「四月生效、三月記錄」被標成「預先排定」——
   * 而它其實是四月一號當天記的當期異動。
   */
  it("UTC 四月一號凌晨記的，在西半球時區仍然是四月", () => {
    expect(
      profileChangeTiming({
        effectiveYear: 2026,
        effectiveMonth: 4,
        recordedAt: at("2026-04-01T02:00:00.000Z"),
      }),
    ).toBeNull();
  });

  // Info: (20260910 - Luphia) 月底那一端同理，方向相反
  it("UTC 三月最後一天深夜記的，仍然是三月", () => {
    expect(
      profileChangeTiming({
        effectiveYear: 2026,
        effectiveMonth: 3,
        recordedAt: at("2026-03-31T23:30:00.000Z"),
      }),
    ).toBeNull();
  });
});

describe("生效早於記錄 → 回溯登記", () => {
  it("四月才補登二月生效的調薪", () => {
    expect(
      profileChangeTiming({
        effectiveYear: 2026,
        effectiveMonth: 2,
        recordedAt: at("2026-04-10T00:00:00.000Z"),
      }),
    ).toBe("backdated");
  });

  // Info: (20260910 - Luphia) 跨年也要對：12 月生效、隔年 1 月才補
  it("跨年的回溯", () => {
    expect(
      profileChangeTiming({
        effectiveYear: 2025,
        effectiveMonth: 12,
        recordedAt: at("2026-01-05T00:00:00.000Z"),
      }),
    ).toBe("backdated");
  });
});

describe("生效晚於記錄 → 預先排定", () => {
  it("三月先講好五月起調薪", () => {
    expect(
      profileChangeTiming({
        effectiveYear: 2026,
        effectiveMonth: 5,
        recordedAt: at("2026-03-20T00:00:00.000Z"),
      }),
    ).toBe("scheduled");
  });

  /**
   * Info: (20260910 - Luphia) **只差一個月也要標。**
   *
   * 「12 月在跑 11 月的薪資」是常態（計劃書 §4），所以相鄰月份的差異
   * 正是最常出現的那一種 —— 判準寫成「差兩個月以上才標」會讓它整組失效。
   */
  it("相鄰月份的預先排定照樣標", () => {
    expect(
      profileChangeTiming({
        effectiveYear: 2026,
        effectiveMonth: 5,
        recordedAt: at("2026-04-28T00:00:00.000Z"),
      }),
    ).toBe("scheduled");
  });

  it("跨年的預先排定", () => {
    expect(
      profileChangeTiming({
        effectiveYear: 2027,
        effectiveMonth: 1,
        recordedAt: at("2026-12-20T00:00:00.000Z"),
      }),
    ).toBe("scheduled");
  });
});

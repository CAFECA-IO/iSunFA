// Info: (20260806 - Tzuhan) 月別推導:錯了的表現是「圖上多一個看不懂的月份」,不是錯誤也不是空白。
// Info: (20260806 - Tzuhan) 因此每一個「回 null」的理由都要有一條測試釘住 —— 猜一個月份比留空嚴重。

import { describe, it, expect } from "@jest/globals";
import { resolveEmissionMonth } from "@/lib/utils/emission_period";
import {
  EMISSION_TIMESTAMP_MAX_SECONDS,
  MILLISECONDS_PER_SECOND,
} from "@/constants/emission_period";

// Info: (20260806 - Tzuhan) 測試資料一律以 UTC 明示建構,不用本機時區(否則測試會隨 CI 所在地飄)
const secondsOf = (iso: string): number =>
  Math.floor(new Date(iso).getTime() / MILLISECONDS_PER_SECOND);

describe("resolveEmissionMonth", () => {
  it("憑證上的日期(UTC 午夜)讀出來就是憑證上的月份", () => {
    expect(resolveEmissionMonth(secondsOf("2025-02-01T00:00:00Z"))).toBe(
      "2025-02",
    );
    expect(resolveEmissionMonth(secondsOf("2025-12-31T00:00:00Z"))).toBe(
      "2025-12",
    );
  });

  it("月份補零至兩位(排序即時序,不必額外排序邏輯)", () => {
    expect(resolveEmissionMonth(secondsOf("2025-03-15T00:00:00Z"))).toBe(
      "2025-03",
    );
    const labels = [
      resolveEmissionMonth(secondsOf("2025-09-01T00:00:00Z")),
      resolveEmissionMonth(secondsOf("2025-10-01T00:00:00Z")),
    ];
    expect([...labels].sort()).toEqual(labels);
  });

  /**
   * Info: (20260806 - Tzuhan) UTC 是**選擇**,不是意外 —— 所以把界線釘成測試。
   *
   * 台北 2025-02-01 04:00 在 UTC 是 1 月 31 日 20:00,本函式回 `2025-01`。
   * 這一格若哪天要改成固定報告時區,這條測試會失敗並指向該處的說明,
   * 而不是讓人以為原本是對的。
   */
  it("月初/月末的時區界線落在 UTC 曆日(已知取捨,不是遺漏)", () => {
    expect(resolveEmissionMonth(secondsOf("2025-01-31T20:00:00Z"))).toBe(
      "2025-01",
    );
    expect(resolveEmissionMonth(secondsOf("2025-02-01T00:00:00Z"))).toBe(
      "2025-02",
    );
  });

  it("沒有時間戳即不猜", () => {
    expect(resolveEmissionMonth(undefined)).toBeNull();
  });

  /**
   * Info: (20260806 - Tzuhan) 這是最貴的一種錯:本專案同時有秒與毫秒兩種慣例
   * (repo 一律轉秒,而 Date.now() 是毫秒)。誤傳毫秒不會噴錯,
   * 只會在圖上長出一個五萬年後的節點 —— 擋掉並回 null。
   */
  it("誤把毫秒當秒即判定為未標註(而不是印出五萬年後的月份)", () => {
    const milliseconds = new Date("2025-02-01T00:00:00Z").getTime();
    expect(resolveEmissionMonth(milliseconds)).toBeNull();
    expect(resolveEmissionMonth(EMISSION_TIMESTAMP_MAX_SECONDS + 1)).toBeNull();
  });

  it("非正整數即不猜", () => {
    expect(resolveEmissionMonth(-1)).toBeNull();
    expect(resolveEmissionMonth(1.5)).toBeNull();
    expect(resolveEmissionMonth(Number.NaN)).toBeNull();
    expect(resolveEmissionMonth(Number.POSITIVE_INFINITY)).toBeNull();
  });

  // Info: (20260806 - Tzuhan) 0 是 1970-01,合法值:補列極舊資料不該被當成壞資料
  it("epoch 0 是合法的月份", () => {
    expect(resolveEmissionMonth(0)).toBe("1970-01");
  });
});

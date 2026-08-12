import { describe, it, expect } from "@jest/globals";
import {
  DEFAULT_FAITH_MEMORY_RETENTION_DAYS,
  FAITH_MEMORY_RETENTION_DAYS_MAX,
} from "@/constants/llm";
import {
  parseRetentionDays,
  resolveMemoryExpiresAt,
} from "@/lib/faith_memory/retention";

/**
 * Info: (20260812 - Luphia) 記憶保留期純函式測試（規範 §7）。
 * 保留天數是**對外承諾**（條款 §3.7 的 90 天），設定值來自後台自由文字，
 * 因此重點在：非法輸入一律退回承諾值，且退回方向永遠是「會刪」而非「留著」。
 */

describe("parseRetentionDays", () => {
  it("accepts a plain positive integer string", () => {
    expect(parseRetentionDays("90")).toBe(90);
    expect(parseRetentionDays("30")).toBe(30);
    expect(parseRetentionDays(" 45 ")).toBe(45);
  });

  it("falls back to the promised default when unset", () => {
    expect(parseRetentionDays(undefined)).toBe(
      DEFAULT_FAITH_MEMORY_RETENTION_DAYS,
    );
    expect(parseRetentionDays(null)).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
    expect(parseRetentionDays("")).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
  });

  /**
   * Info: (20260812 - Luphia) Number() 會放行這些寫法而算出意料外的天數：
   * "9e2" → 900、"0x5A" → 90（十六進位）、"90.9" → 90.9（非整數天）。
   * 後台打錯字不該變成默默改掉保留期。
   */
  it("rejects numeric forms that Number() would silently accept", () => {
    for (const raw of ["9e2", "0x5A", "90.9", "1_0", "+90", "-90", "９０"]) {
      expect(parseRetentionDays(raw)).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
    }
  });

  it("rejects zero and out-of-range values", () => {
    expect(parseRetentionDays("0")).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
    expect(
      parseRetentionDays(String(FAITH_MEMORY_RETENTION_DAYS_MAX + 1)),
    ).toBe(DEFAULT_FAITH_MEMORY_RETENTION_DAYS);
    // Info: (20260812 - Luphia) 「多打一個零」是最可能的手誤，且後果是記憶近乎永不刪除
    expect(parseRetentionDays("90000")).toBe(
      DEFAULT_FAITH_MEMORY_RETENTION_DAYS,
    );
  });

  it("accepts the boundaries themselves", () => {
    expect(parseRetentionDays("1")).toBe(1);
    expect(parseRetentionDays(String(FAITH_MEMORY_RETENTION_DAYS_MAX))).toBe(
      FAITH_MEMORY_RETENTION_DAYS_MAX,
    );
  });
});

describe("resolveMemoryExpiresAt", () => {
  // Info: (20260812 - Luphia) 2026-08-12 00:00 UTC，固定錨點（不讀系統時鐘）
  const ENDED_AT_MS = Date.UTC(2026, 7, 12);

  it("adds the retention window to the subscription end", () => {
    const expiresAt = resolveMemoryExpiresAt(ENDED_AT_MS, 90);
    expect(expiresAt.getTime()).toBe(ENDED_AT_MS + 90 * 24 * 60 * 60 * 1000);
    expect(expiresAt.toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });

  it("tracks the configured value rather than a hardcoded 90", () => {
    const expiresAt = resolveMemoryExpiresAt(ENDED_AT_MS, 30);
    expect(expiresAt.toISOString()).toBe("2026-09-11T00:00:00.000Z");
  });
});

import { describe, it, expect } from "@jest/globals";
import { evaluateOvertimeLimits } from "@/lib/overtime_rules";
import { OvertimeLimitKind } from "@/interfaces/overtime";

/**
 * Info: (20260817 - Julian) T13：法定工時上限（勞動基準法 §32 II、III）。
 *
 * 這些是**護欄不是提示**：越過它們的輸入不是「需要人判斷的例外」，是違法。
 * 引擎回傳違反清單，由 service 丟對應的 `AppError`（ADR 024 §6.2）。
 */

const base = {
  regularWorkMinutes: 480,
  dailyOvertimeMinutes: 0,
  monthlyOvertimeMinutes: 0,
  quarterlyOvertimeMinutes: 0,
  extendedLimitAgreed: false,
};

const kinds = (input: Parameters<typeof evaluateOvertimeLimits>[0]) =>
  evaluateOvertimeLimits(input).violations.map((item) => item.kind);

describe("單日上限：正常工時 + 延長工時 ≤ 12 小時（§32 II）", () => {
  it("八小時班加四小時加班恰好觸線，通過", () => {
    expect(kinds({ ...base, dailyOvertimeMinutes: 4 * 60 })).toEqual([]);
  });

  it("多一分鐘即違反", () => {
    const result = evaluateOvertimeLimits({
      ...base,
      dailyOvertimeMinutes: 4 * 60 + 1,
    });
    expect(result.violations).toEqual([
      {
        kind: OvertimeLimitKind.DAILY_TOTAL,
        limitMinutes: 720,
        actualMinutes: 721,
      },
    ]);
  });

  /**
   * Info: (20260817 - Julian) 上限是「正常工時加計延長工時」，不是單看加班時數 ——
   * 六小時班的人可以加六小時，八小時班的人只能加四小時。
   */
  it("短班別的人可以加更多班（上限看的是當日總工時）", () => {
    expect(
      kinds({
        ...base,
        regularWorkMinutes: 6 * 60,
        dailyOvertimeMinutes: 6 * 60,
      }),
    ).toEqual([]);
  });
});

describe("單月上限：未經同意 46 小時、經同意 54 小時（§32 II、III）", () => {
  it("未經同意時 46 小時通過、46 小時又一分鐘違反", () => {
    expect(kinds({ ...base, monthlyOvertimeMinutes: 46 * 60 })).toEqual([]);
    expect(kinds({ ...base, monthlyOvertimeMinutes: 46 * 60 + 1 })).toEqual([
      OvertimeLimitKind.MONTHLY,
    ]);
  });

  /**
   * Info: (20260817 - Julian) 放寬到 54 小時的前提是有記載的工會或勞資會議同意。
   * 「有沒有記載」由 repository 的不變式擋（agreementRecordUrl 與 agreedAt 必填），
   * 引擎只認一個布林值 —— 但這條測試釘住「沒有同意就退回 46 小時」這個預設。
   */
  it("未經同意者不得享有 54 小時", () => {
    expect(kinds({ ...base, monthlyOvertimeMinutes: 50 * 60 })).toEqual([
      OvertimeLimitKind.MONTHLY,
    ]);
  });

  it("經同意者 54 小時通過、多一分鐘違反", () => {
    expect(
      kinds({
        ...base,
        extendedLimitAgreed: true,
        monthlyOvertimeMinutes: 54 * 60,
      }),
    ).toEqual([]);
    expect(
      kinds({
        ...base,
        extendedLimitAgreed: true,
        monthlyOvertimeMinutes: 54 * 60 + 1,
      }),
    ).toEqual([OvertimeLimitKind.MONTHLY]);
  });
});

describe("三個月上限：138 小時（§32 III）", () => {
  it("經同意者超過 138 小時違反", () => {
    expect(
      kinds({
        ...base,
        extendedLimitAgreed: true,
        quarterlyOvertimeMinutes: 138 * 60 + 1,
      }),
    ).toEqual([OvertimeLimitKind.QUARTERLY]);
  });

  /**
   * Info: (20260817 - Julian) 未經同意者每月上限就是 46 小時，三個月自然不可能超過 138 ——
   * 額外檢查一次只會產出一條永遠不會觸發的規則。
   */
  it("未經同意者不檢查三個月上限（該規則對它不適用）", () => {
    expect(
      kinds({ ...base, quarterlyOvertimeMinutes: 200 * 60 }),
    ).not.toContain(OvertimeLimitKind.QUARTERLY);
  });
});

describe("多條同時違反", () => {
  it("回傳清單而非第一個，service 才能給出正確的錯誤碼", () => {
    const result = kinds({
      regularWorkMinutes: 480,
      dailyOvertimeMinutes: 300,
      monthlyOvertimeMinutes: 60 * 60,
      quarterlyOvertimeMinutes: 200 * 60,
      extendedLimitAgreed: true,
    });
    expect(result).toEqual([
      OvertimeLimitKind.DAILY_TOTAL,
      OvertimeLimitKind.MONTHLY,
      OvertimeLimitKind.QUARTERLY,
    ]);
  });

  it("違反內容帶出上限與實際值，供錯誤訊息交代清楚", () => {
    const [violation] = evaluateOvertimeLimits({
      ...base,
      monthlyOvertimeMinutes: 50 * 60,
    }).violations;
    expect(violation).toEqual({
      kind: OvertimeLimitKind.MONTHLY,
      limitMinutes: 2760,
      actualMinutes: 3000,
    });
  });
});

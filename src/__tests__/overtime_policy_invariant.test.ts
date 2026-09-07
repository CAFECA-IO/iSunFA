import { describe, it, expect } from "@jest/globals";
import {
  assertOvertimePolicy,
  OvertimePolicyInvariantError,
} from "@/repositories/overtime_policy_invariant";

/**
 * Info: (20260818 - Julian) 加班政策的不變式（ADR 024 §6.1）。
 *
 * §32 III 把單月上限從 46 小時放寬到 54 小時的前提是「經工會同意，
 * 如事業單位無工會者，經勞資會議同意」。**一個沒有記載的『已同意』
 * 等於沒有同意，而系統會據此多放 8 小時** —— 那是會被開罰的 8 小時。
 *
 * 擋在 repository 而不是 service：這一列也會被 seed 與資料遷移寫入。
 */

const AGREED_AT = new Date("2026-07-01T00:00:00.000Z");
const RECORD_URL = "https://example.com/minutes/2026-07-01.pdf";

describe("放寬上限必須有記載", () => {
  it("同意 + 完整記載：通過", () => {
    expect(() =>
      assertOvertimePolicy({
        extendedLimitAgreed: true,
        agreementRecordUrl: RECORD_URL,
        agreedAt: AGREED_AT,
        compensatoryExpiryMonths: 6,
      }),
    ).not.toThrow();
  });

  it.each([null, undefined, "", "   "])(
    "同意卻沒有記載連結（%p）：擋下",
    (url) => {
      expect(() =>
        assertOvertimePolicy({
          extendedLimitAgreed: true,
          agreementRecordUrl: url as string | null | undefined,
          agreedAt: AGREED_AT,
          compensatoryExpiryMonths: null,
        }),
      ).toThrow(OvertimePolicyInvariantError);
    },
  );

  it("同意卻沒有記載日期：擋下 —— 沒有日期就綁不到任何一次會議", () => {
    expect(() =>
      assertOvertimePolicy({
        extendedLimitAgreed: true,
        agreementRecordUrl: RECORD_URL,
        agreedAt: null,
        compensatoryExpiryMonths: null,
      }),
    ).toThrow(OvertimePolicyInvariantError);
  });

  /**
   * Info: (20260818 - Julian) 未同意時不要求記載，且**留著舊記載也放行**：
   * 那是歷史，撤銷同意不該連帶把「曾經同意過」這件事抹掉。
   */
  it("未同意時不要求記載，舊記載可以留著", () => {
    expect(() =>
      assertOvertimePolicy({
        extendedLimitAgreed: false,
        agreementRecordUrl: RECORD_URL,
        agreedAt: AGREED_AT,
        compensatoryExpiryMonths: null,
      }),
    ).not.toThrow();
  });
});

describe("補休期限", () => {
  /**
   * Info: (20260818 - Julian) §32-1 只說「期限由勞雇雙方協商」，沒有法定日數，
   * 所以 null 是合法狀態（那時換不了補休，由 service 擋並說明原因）。
   */
  it("null 代表尚未協商，是合法狀態", () => {
    expect(() =>
      assertOvertimePolicy({
        extendedLimitAgreed: false,
        agreementRecordUrl: null,
        agreedAt: null,
        compensatoryExpiryMonths: null,
      }),
    ).not.toThrow();
  });

  it.each([0, -1, 1.5])("設定成 %p 會被擋下", (months) => {
    expect(() =>
      assertOvertimePolicy({
        extendedLimitAgreed: false,
        agreementRecordUrl: null,
        agreedAt: null,
        compensatoryExpiryMonths: months,
      }),
    ).toThrow(OvertimePolicyInvariantError);
  });
});

import { describe, it, expect } from "@jest/globals";
import {
  LeavePolicyInvariantError,
  assertLeavePolicyUnit,
  IStorableLeavePolicy,
} from "@/repositories/leave_policy_invariant";
import {
  LeaveAccrualMethod,
  LeaveQuotaMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) 假別設定的不變式。
 *
 * 每一條的測試都成對出現：「合法的通過」與「非法的擋下」。
 * 只測擋下的那一半，會讓一條「永遠丟例外」的守衛看起來完全正確。
 */

const valid: IStorableLeavePolicy = {
  id: "policy-annual",
  accrualMethod: LeaveAccrualMethod.SENIORITY_TIER,
  quotaMode: LeaveQuotaMode.QUOTA,
  unitBasis: LeaveUnitBasis.FIXED_MINUTES,
  minimumUnitMinutes: 60,
  annualDays: null,
  cashOutOnExpiry: true,
  mergesIntoPolicyId: null,
};

describe("assertLeavePolicyUnit — 最小單位", () => {
  it("特休的預設設定通過", () => {
    expect(() => assertLeavePolicyUnit(valid)).not.toThrow();
  });

  it.each([30, 60, 15, 20])(
    "能整除 60 的最小單位（%i 分鐘）通過",
    (minutes) => {
      expect(() =>
        assertLeavePolicyUnit({ ...valid, minimumUnitMinutes: minutes }),
      ).not.toThrow();
    },
  );

  it("FIXED_MINUTES 卻沒有分鐘數：引擎沒有東西可以捨入", () => {
    expect(() =>
      assertLeavePolicyUnit({ ...valid, minimumUnitMinutes: null }),
    ).toThrow(LeavePolicyInvariantError);
  });

  /**
   * Info: (20260817 - Julian) 7 分鐘的最小單位會讓「請一小時」變成 63 分鐘，
   * 而使用者在畫面上選的是「1 小時」。
   */
  it.each([7, 45, 0, -30, 1.5])(
    "無法整除 60 的最小單位（%p）擋下",
    (minutes) => {
      expect(() =>
        assertLeavePolicyUnit({ ...valid, minimumUnitMinutes: minutes }),
      ).toThrow(LeavePolicyInvariantError);
    },
  );

  it.each([LeaveUnitBasis.HALF_WORKDAY, LeaveUnitBasis.FULL_WORKDAY])(
    "%s 必須把 minimumUnitMinutes 留成 null（不是忽略，是必須沒有）",
    (unitBasis) => {
      expect(() =>
        assertLeavePolicyUnit({
          ...valid,
          unitBasis,
          minimumUnitMinutes: null,
        }),
      ).not.toThrow();
      expect(() =>
        assertLeavePolicyUnit({ ...valid, unitBasis, minimumUnitMinutes: 30 }),
      ).toThrow(LeavePolicyInvariantError);
    },
  );
});

describe("assertLeavePolicyUnit — 給假方式與日數", () => {
  /**
   * Info: (20260817 - Julian) 級距表說滿三年 14 日、annualDays 說 7 日，
   * 引擎讀級距、設定畫面讀 annualDays —— 同一個假別在兩個地方顯示不同的數字。
   */
  it("依年資級距者不得同時帶固定年度日數", () => {
    expect(() => assertLeavePolicyUnit({ ...valid, annualDays: 7 })).toThrow(
      LeavePolicyInvariantError,
    );
  });

  it("固定日數的假別（事假 14 日）通過", () => {
    expect(() =>
      assertLeavePolicyUnit({
        ...valid,
        accrualMethod: LeaveAccrualMethod.FIXED_PER_CYCLE,
        annualDays: 14,
        cashOutOnExpiry: false,
      }),
    ).not.toThrow();
  });
});

describe("assertLeavePolicyUnit — 額度模式與折現", () => {
  it("不限額度的假別（公傷病假）通過", () => {
    expect(() =>
      assertLeavePolicyUnit({
        ...valid,
        accrualMethod: LeaveAccrualMethod.NONE,
        quotaMode: LeaveQuotaMode.UNLIMITED,
        unitBasis: LeaveUnitBasis.FULL_WORKDAY,
        minimumUnitMinutes: null,
        cashOutOnExpiry: false,
      }),
    ).not.toThrow();
  });

  /**
   * Info: (20260817 - Julian) UNLIMITED 不建 LeaveGrant，沒有批次會到期。
   * 標了 cashOutOnExpiry 的效果是 Worker 去找一組永遠是空的批次，
   * 然後什麼也不做 —— 而 HR 會以為系統在幫他算折現。
   */
  it("不限額度者標「屆期折現」擋下（那個開關不會有任何效果）", () => {
    expect(() =>
      assertLeavePolicyUnit({
        ...valid,
        quotaMode: LeaveQuotaMode.UNLIMITED,
        cashOutOnExpiry: true,
      }),
    ).toThrow(LeavePolicyInvariantError);
  });
});

describe("assertLeavePolicyUnit — 併計對象", () => {
  it("家庭照顧假併入事假通過", () => {
    expect(() =>
      assertLeavePolicyUnit({
        ...valid,
        id: "policy-family-care",
        accrualMethod: LeaveAccrualMethod.FIXED_PER_CYCLE,
        annualDays: 7,
        cashOutOnExpiry: false,
        mergesIntoPolicyId: "policy-personal",
      }),
    ).not.toThrow();
  });

  it("併入自己擋下（請一天會扣兩天）", () => {
    expect(() =>
      assertLeavePolicyUnit({
        ...valid,
        id: "policy-x",
        mergesIntoPolicyId: "policy-x",
      }),
    ).toThrow(LeavePolicyInvariantError);
  });

  it("新建（尚無 id）時不誤判自我併計", () => {
    expect(() =>
      assertLeavePolicyUnit({
        ...valid,
        id: undefined,
        mergesIntoPolicyId: "policy-personal",
      }),
    ).not.toThrow();
  });
});

describe("錯誤訊息", () => {
  it("帶出表名、成因與實際值，讓看 log 的人不必再猜", () => {
    try {
      assertLeavePolicyUnit({ ...valid, minimumUnitMinutes: 7 });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(LeavePolicyInvariantError);
      expect((error as Error).message).toContain("LeavePolicy:");
      expect((error as Error).message).toContain("minimumUnitMinutes=7");
    }
  });
});

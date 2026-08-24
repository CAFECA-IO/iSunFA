import { describe, it, expect } from "@jest/globals";
import {
  LeavePolicyInvariantError,
  assertLeavePolicyUnit,
  IStorableLeavePolicy,
} from "@/repositories/leave_policy_invariant";
import {
  LeaveCycleBasis,
  DEFAULT_LEAVE_POLICY_SEED,
  LeaveAccrualMethod,
  LeaveProofRequirement,
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
  cycleBasis: LeaveCycleBasis.HIRE_ANNIVERSARY,
  id: "policy-annual",
  accrualMethod: LeaveAccrualMethod.SENIORITY_TIER,
  quotaMode: LeaveQuotaMode.QUOTA,
  unitBasis: LeaveUnitBasis.FIXED_MINUTES,
  minimumUnitMinutes: 60,
  annualDays: null,
  cashOutOnExpiry: true,
  mergesIntoPolicyId: null,
  proofRequirement: LeaveProofRequirement.NONE,
  proofThresholdDays: null,
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

/**
 * Info: (20260817 - Julian) 證明門檻。
 *
 * 這條是後來補的，成因值得留下：`DEFAULT_LEAVE_POLICY_SEED` 有五個假別標了
 * `REQUIRED_OVER_THRESHOLD`，而 `ILeavePolicySeed` 當時**根本沒有門檻欄位** ——
 * 五列全部帶著 null 門檻落地，而且不會報錯。
 *
 * 這種「一個 enum 值宣告了一條規則，而它的參數不存在」的組合，
 * 與 `FIXED_MINUTES ⇒ minimumUnitMinutes` 是同一個形狀。
 */
describe("assertLeavePolicyUnit — 證明門檻", () => {
  const threshold = (
    proofRequirement: LeaveProofRequirement,
    proofThresholdDays: number | null,
  ): IStorableLeavePolicy => ({
    ...valid,
    proofRequirement,
    proofThresholdDays,
  });

  it("NONE 且無門檻通過", () => {
    expect(() =>
      assertLeavePolicyUnit(threshold(LeaveProofRequirement.NONE, null)),
    ).not.toThrow();
  });

  it("OPTIONAL 且無門檻通過", () => {
    expect(() =>
      assertLeavePolicyUnit(threshold(LeaveProofRequirement.OPTIONAL, null)),
    ).not.toThrow();
  });

  it("REQUIRED_OVER_THRESHOLD 帶正數門檻通過", () => {
    expect(() =>
      assertLeavePolicyUnit(
        threshold(LeaveProofRequirement.REQUIRED_OVER_THRESHOLD, 3),
      ),
    ).not.toThrow();
  });

  // Info: (20260817 - Julian) 半天的門檻是合理的（請半天以上就要證明），故接受小數
  it("門檻可以是小數", () => {
    expect(() =>
      assertLeavePolicyUnit(
        threshold(LeaveProofRequirement.REQUIRED_OVER_THRESHOLD, 0.5),
      ),
    ).not.toThrow();
  });

  it("REQUIRED_OVER_THRESHOLD 但門檻為 null 時擋下", () => {
    expect(() =>
      assertLeavePolicyUnit(
        threshold(LeaveProofRequirement.REQUIRED_OVER_THRESHOLD, null),
      ),
    ).toThrow(LeavePolicyInvariantError);
  });

  it("REQUIRED_OVER_THRESHOLD 但門檻為 undefined 時擋下", () => {
    expect(() =>
      assertLeavePolicyUnit({
        ...valid,
        proofRequirement: LeaveProofRequirement.REQUIRED_OVER_THRESHOLD,
        proofThresholdDays: undefined,
      }),
    ).toThrow(LeavePolicyInvariantError);
  });

  /**
   * Info: (20260817 - Julian) 0 讀起來是「超過 0 日就要證明」＝ 一律要證明。
   * 那個語意真實存在（職災認定、診斷證明都與日數無關），但 enum 沒有成員
   * 表達它 —— 放行 0 等於用門檻欄位偷渡一個缺失的 enum 值，
   * 而那個缺口從此不會有人再提。
   */
  it.each([0, -1])(
    "門檻為 %i 時擋下：那是缺一個 REQUIRED，不是一個門檻",
    (days) => {
      expect(() =>
        assertLeavePolicyUnit(
          threshold(LeaveProofRequirement.REQUIRED_OVER_THRESHOLD, days),
        ),
      ).toThrow(LeavePolicyInvariantError);
    },
  );

  it.each([LeaveProofRequirement.NONE, LeaveProofRequirement.OPTIONAL])(
    "%s 帶著殘留門檻時擋下（它看起來像設定，實際什麼也不做）",
    (requirement) => {
      expect(() => assertLeavePolicyUnit(threshold(requirement, 3))).toThrow(
        LeavePolicyInvariantError,
      );
    },
  );
});

/**
 * Info: (20260817 - Julian) 內建假別的 seed 必須自己通過不變式。
 *
 * seed 是假別設定風險最高的寫入路徑（ADR 021 §5：「seed 成為正確性的一部分」），
 * 而它繞過所有 service。這一條讓「seed 與不變式不一致」在單元測試就爆，
 * 而不是等到有人跑 `npx tsx scripts/seed/...` 才發現 —— 那正是這次的實際經過。
 */
describe("DEFAULT_LEAVE_POLICY_SEED", () => {
  // Info: (20260817 - Julian) 傳物件而非 tuple：tuple 會讓 TS 把元素型別放寬成聯集
  it.each(DEFAULT_LEAVE_POLICY_SEED)("$code 通過不變式", (seed) => {
    expect(() =>
      assertLeavePolicyUnit({
        accrualMethod: seed.accrualMethod,
        cycleBasis: seed.cycleBasis,
        quotaMode: seed.quotaMode,
        unitBasis: seed.unitBasis,
        minimumUnitMinutes: seed.minimumUnitMinutes,
        annualDays: seed.annualDays,
        cashOutOnExpiry: seed.cashOutOnExpiry,
        mergesIntoPolicyId: null,
        proofRequirement: seed.proofRequirement,
        proofThresholdDays: seed.proofThresholdDays,
      }),
    ).not.toThrow();
  });
});

/**
 * Info: (20260819 - Julian) 年資級距 + 曆年制的暫時性拒絕（review B3）。
 *
 * ADR 021 §3.1 承諾的護欄 `assertCycleNotDisadvantageous` **從未實作** ——
 * 引擎側的 `compareCycleBasisEntitlement()` 有、錯誤碼有、斷言錯誤碼存在的
 * 測試也有，就是沒有任何地方丟它。而現行曆年制比例公式會少給
 * （計畫書 §17 缺口 9：3/1 到職者第一個年資年度拿到 1.1 日，法定 3 日）。
 *
 * 在公式修正前，這條不變式擋住唯一會踩到 §38 法定下界的組合。
 * 它擋在 repository 而不是只擋在 validator，因為**內建假別是 seed 產生的**，
 * 而 seed 繞過所有 service（ADR 021 §5）。
 */
describe("年資級距 + 曆年制（缺口 9 的暫代護欄）", () => {
  it("拒絕 SENIORITY_TIER + CALENDAR_YEAR", () => {
    expect(() =>
      assertLeavePolicyUnit({
        ...valid,
        accrualMethod: LeaveAccrualMethod.SENIORITY_TIER,
        cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
        annualDays: null,
      }),
    ).toThrow(LeavePolicyInvariantError);
  });

  it("年資級距配週年制照常放行（特休就是這一組）", () => {
    expect(() =>
      assertLeavePolicyUnit({
        ...valid,
        accrualMethod: LeaveAccrualMethod.SENIORITY_TIER,
        cycleBasis: LeaveCycleBasis.HIRE_ANNIVERSARY,
        annualDays: null,
      }),
    ).not.toThrow();
  });

  /**
   * Info: (20260819 - Julian) 其餘曆年制不受影響 —— 事假 14 日、病假 30 日
   * 是「一年內不超過」的**上限**，沒有逐年的法定下界要守。
   * 擋過頭會讓 13 個內建假別裡的 11 個種不進去。
   */
  it.each([LeaveAccrualMethod.FIXED_PER_CYCLE, LeaveAccrualMethod.PER_EVENT])(
    "%s 配曆年制照常放行",
    (accrualMethod) => {
      expect(() =>
        assertLeavePolicyUnit({
          ...valid,
          accrualMethod,
          cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
        }),
      ).not.toThrow();
    },
  );
});

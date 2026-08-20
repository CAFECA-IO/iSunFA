import { describe, it, expect } from "@jest/globals";
import {
  assertLeavePolicyUnit,
  assertNoMergeCycle,
  LeavePolicyInvariantError,
  LeavePolicyMergeCycleError,
} from "@/repositories/leave_policy_invariant";
import {
  LeaveAccrualMethod,
  LeaveCycleBasis,
  LeaveProofRequirement,
  LeaveQuotaMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";

/**
 * Info: (20260818 - Julian) 併計關係不得成環（L2 / L3）。
 *
 * 家庭照顧假併入事假（性平法 §20）是一個有向關係。A→B→A 的效果是
 * `allocateConsumption` 沿著環一直扣 —— 請一天假，兩個假別各扣一天，
 * 而兩邊的餘額都對不上帳本。
 *
 * `assertLeavePolicyUnit` 只看得到被寫入的那一列，所以只擋得住 A→A；
 * 更長的環需要整個帳本的關係圖，那是這一支的職責。
 */

// Info: (20260818 - Julian) 事假（PERSONAL）是併計的終點，家庭照顧假指向它
const CHAIN: Readonly<Record<string, string | null>> = {
  personal: null,
  familyCare: "personal",
  sick: null,
};

describe("沒有環的情形", () => {
  it("指向 null（不併計）：通過", () => {
    expect(() =>
      assertNoMergeCycle({ edges: CHAIN, from: "familyCare", to: null }),
    ).not.toThrow();
  });

  it("指向一個終點：通過", () => {
    expect(() =>
      assertNoMergeCycle({ edges: CHAIN, from: "menstrual", to: "personal" }),
    ).not.toThrow();
  });

  it("指向一條既有的鏈（menstrual → familyCare → personal）：通過", () => {
    expect(() =>
      assertNoMergeCycle({ edges: CHAIN, from: "menstrual", to: "familyCare" }),
    ).not.toThrow();
  });

  /**
   * Info: (20260818 - Julian) `mergesIntoPolicyId` 是 `onDelete: SetNull`，
   * 因此走到圖外（被刪掉的假別）是正常狀態，不是環。
   */
  it("鏈走到圖外就停，不當成環", () => {
    expect(() =>
      assertNoMergeCycle({
        edges: { orphan: "already-deleted" },
        from: "newOne",
        to: "orphan",
      }),
    ).not.toThrow();
  });
});

describe("成環的情形", () => {
  it("自指（A→A）：擋下", () => {
    expect(() =>
      assertNoMergeCycle({ edges: CHAIN, from: "personal", to: "personal" }),
    ).toThrow(LeavePolicyInvariantError);
  });

  it("兩步環（personal → familyCare → personal）：擋下", () => {
    expect(() =>
      assertNoMergeCycle({ edges: CHAIN, from: "personal", to: "familyCare" }),
    ).toThrow(LeavePolicyInvariantError);
  });

  it("三步環：擋下", () => {
    const edges = { a: "b", b: "c", c: null };
    expect(() => assertNoMergeCycle({ edges, from: "c", to: "a" })).toThrow(
      LeavePolicyInvariantError,
    );
  });

  /**
   * Info: (20260818 - Julian) 圖裡本來就有的環也要擋 —— 不是只擋「這次會造成環」。
   * 資料遷移或早期沒有這道守衛時寫進去的環，會在下一次修改時被抓出來。
   */
  it("既有的環在走訪途中被撞到也擋下", () => {
    const edges = { x: "y", y: "x", z: null };
    expect(() => assertNoMergeCycle({ edges, from: "z", to: "x" })).toThrow(
      LeavePolicyInvariantError,
    );
  });
});

/**
 * Info: (20260820 - Julian) 成環要收斂成**它自己的碼**（review 第 11 輪第 3 條）。
 *
 * ## 被修掉的落差
 *
 * `assertNoMergeCycle` 原本丟的是通用的 `LeavePolicyInvariantError`，而
 * `LeavePolicyService.write()` 把它一律收斂成 `VA_INVALID_INPUT_DATA`。
 * 專屬的 `VA_LEAVE_POLICY_MERGE_CYCLE` 因此只有 service 的**前置檢查**走得到 ——
 * 而前置檢查在併發下會漏（兩個人同時把 A→B 與 B→A 寫進去，各自讀到的圖
 * 都還沒有對方那一筆）。也就是：**唯一真的需要 repository 那道閘的情境，
 * 使用者收到的是「輸入格式錯誤」**，於是他去檢查自己剛才填的欄位 ——
 * 而那些欄位都是對的。
 */
describe("成環的錯誤型別（M22 的錯誤碼收斂）", () => {
  const CHAIN: Readonly<Record<string, string | null>> = {
    personal: null,
    familyCare: "personal",
    menstrual: null,
  };

  const cycleError = (): unknown => {
    try {
      assertNoMergeCycle({ edges: CHAIN, from: "personal", to: "familyCare" });
    } catch (error) {
      return error;
    }
    throw new Error("預期會丟成環錯誤，但它通過了");
  };

  it("丟的是專屬型別，而不只是通用的不變式錯誤", () => {
    expect(cycleError()).toBeInstanceOf(LeavePolicyMergeCycleError);
  });

  /**
   * Info: (20260820 - Julian) 仍然**是**通用型別的子類別。
   *
   * 少了這一條，把它改成獨立的類別也會讓上面那條通過 ——
   * 而那會讓 `write()` 裡既有的 `instanceof LeavePolicyInvariantError`
   * 漏接它，於是成環變成一個沒有人收斂的例外，route 收成 500。
   */
  it("同時仍是 LeavePolicyInvariantError 的子類別", () => {
    expect(cycleError()).toBeInstanceOf(LeavePolicyInvariantError);
  });

  /**
   * Info: (20260820 - Julian) 反方向：**其他**判準不得被貼上成環的碼。
   *
   * `write()` 的兩個 `instanceof` 有先後之分，而先後寫反的症狀是
   * 「所有假別設定錯誤都說成環」—— 一句同樣沒有訊息量的話，只是換了個方向。
   */
  it("其他不變式丟的仍是通用型別，不是成環型別", () => {
    let caught: unknown = null;
    try {
      assertLeavePolicyUnit({
        accrualMethod: LeaveAccrualMethod.FIXED_PER_CYCLE,
        cycleBasis: LeaveCycleBasis.CALENDAR_YEAR,
        quotaMode: LeaveQuotaMode.QUOTA,
        unitBasis: LeaveUnitBasis.FIXED_MINUTES,
        // Info: (20260820 - Julian) 不整除 60 → `assertLeavePolicyUnit` 擋下
        minimumUnitMinutes: 7,
        annualDays: 3,
        cashOutOnExpiry: false,
        mergesIntoPolicyId: null,
        proofRequirement: LeaveProofRequirement.NONE,
        proofThresholdDays: null,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(LeavePolicyInvariantError);
    expect(caught).not.toBeInstanceOf(LeavePolicyMergeCycleError);
  });
});

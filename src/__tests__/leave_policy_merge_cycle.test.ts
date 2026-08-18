import { describe, it, expect } from "@jest/globals";
import {
  assertNoMergeCycle,
  LeavePolicyInvariantError,
} from "@/repositories/leave_policy_invariant";

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

import { describe, it, expect } from "@jest/globals";
import {
  LeaveApprovalRuleInvariantError,
  assertRuleRangesDisjoint,
} from "@/repositories/leave_approval_rule_invariant";

/**
 * Info: (20260817 - Julian) 簽核規則區間的不變式。
 *
 * 本檔存在的主要理由是**覆蓋**而不是不重疊：漏掉覆蓋會讓某個天數
 * 展開出空鏈，而空鏈的錯誤訊息會指向「您尚未設定直屬主管」——
 * 使用者會去改人事資料，改到對為止都不會有效，因為真正的原因在這張表。
 */

// Info: (20260817 - Julian) 需求的兩條規則：[0, 3) 直屬主管、[3, ∞) 直屬主管→部門經理→HR
const requirementRules = [
  { minDays: 0, maxDays: 3 },
  { minDays: 3, maxDays: null },
];

describe("assertRuleRangesDisjoint — 合法設定", () => {
  it("需求的兩段式設定通過", () => {
    expect(() => assertRuleRangesDisjoint(requirementRules)).not.toThrow();
  });

  it("輸入順序不影響判定（先排序再檢查）", () => {
    expect(() =>
      assertRuleRangesDisjoint([...requirementRules].reverse()),
    ).not.toThrow();
  });

  it("單一條無上界的規則通過（全部都走同一關）", () => {
    expect(() =>
      assertRuleRangesDisjoint([{ minDays: 0, maxDays: null }]),
    ).not.toThrow();
  });

  it("三段以上通過", () => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: 1 },
        { minDays: 1, maxDays: 3 },
        { minDays: 3, maxDays: 10 },
        { minDays: 10, maxDays: null },
      ]),
    ).not.toThrow();
  });

  it("小數邊界通過（請半天也要有規則命中）", () => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: 0.5 },
        { minDays: 0.5, maxDays: null },
      ]),
    ).not.toThrow();
  });

  /**
   * Info: (20260817 - Julian) 空集合合法：代表這個假別沒有專屬規則、走通則。
   * 通則本身是空的則由 service 在展開時擋 —— 那時才知道有沒有假單要送。
   */
  it("空集合通過（該假別走通則）", () => {
    expect(() => assertRuleRangesDisjoint([])).not.toThrow();
  });
});

describe("assertRuleRangesDisjoint — 覆蓋", () => {
  it("不是從 0 起：請半天沒有任何規則命中", () => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 1, maxDays: 3 },
        { minDays: 3, maxDays: null },
      ]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });

  it("中間留洞：洞裡的天數會變成一個誤導性的「沒有主管」錯誤", () => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: 3 },
        { minDays: 5, maxDays: null },
      ]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });

  /**
   * Info: (20260817 - Julian) 留一個上界等於宣告「超過 N 天的假不需要任何人簽核」——
   * 而那正是最需要簽核的那一種。
   */
  it("最後一條有上界：最長的假反而不用簽核", () => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: 3 },
        { minDays: 3, maxDays: 30 },
      ]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });

  it("無上界的規則不在最後：其後的規則永遠命不到", () => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: null },
        { minDays: 3, maxDays: null },
      ]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });
});

describe("assertRuleRangesDisjoint — 重疊與區間本身", () => {
  it("重疊：同一張單會有兩條不同的簽核鏈", () => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: 5 },
        { minDays: 3, maxDays: null },
      ]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });

  it("零寬區間永遠命不中", () => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: 0 },
        { minDays: 0, maxDays: null },
      ]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });

  it("上界小於下界擋下", () => {
    expect(() =>
      assertRuleRangesDisjoint([{ minDays: 3, maxDays: 1 }]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });

  it("負數下界擋下", () => {
    expect(() =>
      assertRuleRangesDisjoint([{ minDays: -1, maxDays: null }]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });
});

describe("錯誤訊息分得出「重疊」與「有洞」", () => {
  /**
   * Info: (20260817 - Julian) 兩者的修法不同（一個要縮、一個要補），
   * 訊息混在一起會讓人修錯方向，然後再撞一次。
   */
  it("有洞的訊息指出洞的位置", () => {
    try {
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: 3 },
        { minDays: 5, maxDays: null },
      ]);
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as Error).message).toContain("gap=[3, 5)");
    }
  });

  it("重疊的訊息指出兩段的範圍", () => {
    try {
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: 5 },
        { minDays: 3, maxDays: null },
      ]);
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as Error).message).toContain("overlap");
      expect((error as Error).message).toContain("[0, 5)");
    }
  });
});

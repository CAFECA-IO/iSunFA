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

/**
 * Info: (20260820 - Julian) 天數門檻必須是**可對帳的十進位**（review 第 4 條）。
 *
 * ## 被修掉的東西
 *
 * `minDays = 1e-7` 通得過 `z.number().min(0).max(366)`、通得過這裡原本的
 * `Number.isFinite`、也通得過區間不重疊與覆蓋的檢查。落地時
 * `String(1e-7)` 寫成 `"1e-7"`（JS 對絕對值小於 `1e-6` 的數字一律用指數記號），
 * 讀回來仍是 `1e-7`，而 `compareDaysTo` 的 `exactRationalOf` 對指數記號
 * 直接丟 `LeaveRuleError` —— 且那個呼叫點**不在** service 那個
 * 「`LeaveRuleError` → 400」的 try 裡面。
 *
 * 症狀：該帳本的每一次試算與送出都 500，而成因是一列設定資料。
 * 改成精確比較之前它只是一次數值比較、不會炸 —— 新核心引進的迴歸。
 *
 * ## 為什麼擋在這裡而不是只擋在 validator
 *
 * seed 與資料遷移不經過 validator，而這一列一旦寫進去，
 * 壞的不是這一列，是整個帳本的假單功能。
 */
describe("天數門檻的十進位形狀", () => {
  // Info: (20260820 - Julian) [說明, 規則]。第一段必須自 0 起，因此壞值放在第二段
  const withSecondRange = (minDays: number, maxDays: number | null = null) => [
    { minDays: 0, maxDays: 3 },
    { minDays, maxDays },
  ];

  it.each([
    ["1e-7（JS 開始用指數記號的第一個值）", 1e-7],
    ["1e-21", 1e-21],
  ])("minDays 是 %s 時擋下", (_label, value) => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: value },
        { minDays: value, maxDays: null },
      ]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });

  it("maxDays 是指數記號時同樣擋下", () => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: 1e-7 },
        { minDays: 1e-7, maxDays: null },
      ]),
    ).toThrow(LeaveApprovalRuleInvariantError);
  });

  /**
   * Info: (20260820 - Julian) 小數位上限三位：簽核門檻是寫在人事規章裡的
   * 一個數字，而 0.0001 天（8.6 秒）作為「這種長度以上要多簽一關」的界線
   * 沒有任何意義。上界擋掉的是誤植與惡意，不是需求。
   */
  it("小數超過三位時擋下", () => {
    expect(() => assertRuleRangesDisjoint(withSecondRange(0.00005))).toThrow(
      LeaveApprovalRuleInvariantError,
    );
  });

  /**
   * Info: (20260820 - Julian) 反面：實務上會寫下來的門檻不得被擋。
   * 只驗上面幾條的話，一個「一律擋」的實作也會通過。
   */
  it.each([
    ["半天", 0.5],
    ["四分之一天", 0.25],
    ["三位小數", 0.125],
    ["整數", 3],
    ["上界", 366],
  ])("%s 放行", (_label, value) => {
    expect(() =>
      assertRuleRangesDisjoint([
        { minDays: 0, maxDays: value },
        { minDays: value, maxDays: null },
      ]),
    ).not.toThrow();
  });
});

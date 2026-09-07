import { describe, it, expect } from "@jest/globals";
import {
  assertConcurrencyRule,
  concurrencyLimitOf,
  LeaveConcurrencyInvariantError,
} from "@/repositories/leave_concurrency_invariant";
import { LeaveConcurrencyAction } from "@/constants/leave_policy";
import {
  assertLedgerActor,
  LeaveLedgerInvariantError,
} from "@/repositories/leave_ledger";

/**
 * Info: (20260820 - Julian) 併休上限的兩條（review 第 5 輪 M1／M2）。
 *
 * M1：名額換算走 double，`90 × 0.7` 少一個名額。
 * M2：schema 宣稱的 XOR 不變式沒有執行者，兩欄皆 null 時上限變成 0 人。
 */

describe("concurrencyLimitOf —— 名額換算不經過 double（M1）", () => {
  /**
   * Info: (20260820 - Julian) 期望值由**整數運算**得出（`floor(h × r / 100)`），
   * 不是抄被測函式：一份抄來的期望名單與缺陷完全相容（checklist §1.9）。
   *
   * 這 12 組是實測 headcount 1–200 × ratio 0.01–0.99 共 19,800 組裡
   * `Math.floor(h * Number(r))` 與正解不一致的全部。
   */
  const GHOST_DIGIT_CASES: readonly [number, string, number][] = [
    [50, "0.58", 29],
    [90, "0.70", 63],
    [100, "0.29", 29],
    [100, "0.57", 57],
    [100, "0.58", 58],
    [150, "0.82", 123],
    [170, "0.70", 119],
    [180, "0.35", 63],
    [180, "0.70", 126],
    [200, "0.29", 58],
    [200, "0.57", 114],
    [200, "0.58", 116],
  ];

  it.each(GHOST_DIGIT_CASES)(
    "%i 人 × %s = %i 個名額（舊式子少一個）",
    (headcount, ratio, expected) => {
      expect(
        concurrencyLimitOf({
          headcount,
          maxConcurrentEmployees: null,
          maxConcurrentRatio: ratio,
        }),
      ).toBe(expected);
      /**
       * Info: (20260820 - Julian) 成對斷言：也要證明**舊式子在這一組上是錯的**。
       * 少了它，這 12 組看起來只是十二個普通的例子，
       * 而下一個人不會知道它們為什麼在這裡。
       */
      expect(Math.floor(headcount * Number(ratio))).toBe(expected - 1);
    },
  );

  it("整個 1–200 × 0.01–0.99 的網格都等於整數運算的答案", () => {
    let mismatches = 0;
    for (let headcount = 1; headcount <= 200; headcount += 1) {
      for (let percent = 1; percent <= 99; percent += 1) {
        const ratio = `0.${String(percent).padStart(2, "0")}`;
        const actual = concurrencyLimitOf({
          headcount,
          maxConcurrentEmployees: null,
          maxConcurrentRatio: ratio,
        });
        if (actual !== Math.floor((headcount * percent) / 100)) mismatches += 1;
      }
    }
    expect(mismatches).toBe(0);
  });

  // Info: (20260820 - Julian) 小數位數沒有上界（Decimal 預設 65,30），照樣精確
  it("三十位小數也不失真", () => {
    expect(
      concurrencyLimitOf({
        headcount: 3,
        maxConcurrentRatio: "0.333333333333333333333333333333",
        maxConcurrentEmployees: null,
      }),
    ).toBe(0);
    expect(
      concurrencyLimitOf({
        headcount: 3,
        maxConcurrentRatio: "0.999999999999999999999999999999",
        maxConcurrentEmployees: null,
      }),
    ).toBe(2);
  });

  it("人數欄有值時直接用它，不碰比例", () => {
    expect(
      concurrencyLimitOf({
        headcount: 90,
        maxConcurrentEmployees: 5,
        maxConcurrentRatio: null,
      }),
    ).toBe(5);
  });

  /**
   * Info: (20260820 - Julian) 兩欄皆空時**不得回 0**。
   * 回 0 就是原本那個 bug：整個部門每一張假單都超限。
   */
  it("兩欄皆空時丟例外，不是回 0", () => {
    expect(() =>
      concurrencyLimitOf({
        headcount: 90,
        maxConcurrentEmployees: null,
        maxConcurrentRatio: null,
      }),
    ).toThrow(LeaveConcurrencyInvariantError);
  });
});

describe("assertConcurrencyRule —— schema 宣稱的那條 XOR（M2）", () => {
  const ruleOf = (
    overrides: Partial<Parameters<typeof assertConcurrencyRule>[0]> = {},
  ) => ({
    maxConcurrentEmployees: 3,
    maxConcurrentRatio: null,
    action: LeaveConcurrencyAction.WARN,
    leavePolicyId: "policy-sick",
    employerMayReject: true,
    ...overrides,
  });

  // Info: (20260820 - Julian) 對照組：合法的兩種寫法都要放行，否則「一律擋」也會通過
  it("恰有人數欄、或恰有比例欄，都放行", () => {
    expect(() => assertConcurrencyRule(ruleOf())).not.toThrow();
    expect(() =>
      assertConcurrencyRule(
        ruleOf({ maxConcurrentEmployees: null, maxConcurrentRatio: "0.30" }),
      ),
    ).not.toThrow();
  });

  /**
   * Info: (20260820 - Julian) 這一條是本檔的紅線：兩欄皆 null。
   * 先前它會被讀成「上限 0 人」，於是該部門請不了假，
   * 而畫面說的是「同時請假人數已達上限」——一句把設定錯誤講成使用者問題的話。
   */
  it("兩欄皆 null 時擋下", () => {
    expect(() =>
      assertConcurrencyRule(
        ruleOf({ maxConcurrentEmployees: null, maxConcurrentRatio: null }),
      ),
    ).toThrow(LeaveConcurrencyInvariantError);
  });

  it("兩欄都填時擋下（沒有依據判斷該信哪一個）", () => {
    expect(() =>
      assertConcurrencyRule(ruleOf({ maxConcurrentRatio: "0.30" })),
    ).toThrow(LeaveConcurrencyInvariantError);
  });

  it.each(["0", "0.00", "-0.30"])("比例為 %s 時擋下", (ratio) => {
    expect(() =>
      assertConcurrencyRule(
        ruleOf({ maxConcurrentEmployees: null, maxConcurrentRatio: ratio }),
      ),
    ).toThrow(LeaveConcurrencyInvariantError);
  });

  /**
   * Info: (20260820 - Julian) §38 II：`BLOCK` 綁在特休上是一條永遠不生效的管制。
   *
   * 三個案例成組，缺一就變成一條太寬或太窄的規則：
   * 綁定特休的 `BLOCK` 要擋；綁定病假的 `BLOCK` 要放行；
   * **涵蓋所有假別**（`leavePolicyId: null`）的 `BLOCK` 也要放行 ——
   * 送出端已經逐假別判斷了，照 schema 註解的字面實作會擋掉這個合法設定。
   */
  it("BLOCK 綁在雇主不得拒絕的假別上時擋下", () => {
    expect(() =>
      assertConcurrencyRule(
        ruleOf({
          action: LeaveConcurrencyAction.BLOCK,
          leavePolicyId: "policy-annual",
          employerMayReject: false,
        }),
      ),
    ).toThrow(LeaveConcurrencyInvariantError);
  });

  it("BLOCK 綁在雇主得拒絕的假別上時放行", () => {
    expect(() =>
      assertConcurrencyRule(ruleOf({ action: LeaveConcurrencyAction.BLOCK })),
    ).not.toThrow();
  });

  it("BLOCK 涵蓋所有假別（未綁定）時放行——逐假別的判斷在送出端", () => {
    expect(() =>
      assertConcurrencyRule(
        ruleOf({
          action: LeaveConcurrencyAction.BLOCK,
          leavePolicyId: null,
          employerMayReject: null,
        }),
      ),
    ).not.toThrow();
  });
});

/**
 * Info: (20260820 - Julian) 額度帳本的操作者三欄同生共死（review 第 6 輪 M16）。
 *
 * `LeaveLedgerEntry.actorEmployeeId` 是 `SetNull`，讀取端先前靠 live join
 * 取姓名 —— 那位人資離職之後，這一列的操作者就變成一個永遠答不出來的 null。
 * 額度帳本是 append-only 的稽核來源（ADR 022 §1），
 * 「這筆調整是誰做的」正是它存在的理由之一。
 *
 * 半套的組合要擋：讀不出是「系統排程產生的」還是「查快照時漏掉了」，
 * 而那兩件事的後續處置完全不同。
 */
describe("assertLedgerActor —— 操作者三欄同生共死（M16）", () => {
  const HUMAN = {
    actorEmployeeId: "emp-hr",
    actorEmployeeNo: "HR001",
    actorName: "林淑芬",
  };

  it("三欄齊全（人為操作）放行", () => {
    expect(() => assertLedgerActor(HUMAN)).not.toThrow();
  });

  it("三欄皆空（系統排程）放行", () => {
    expect(() =>
      assertLedgerActor({
        actorEmployeeId: null,
        actorEmployeeNo: null,
        actorName: null,
      }),
    ).not.toThrow();
  });

  /**
   * Info: (20260820 - Julian) 三種半套各測一次。
   *
   * 只測「有 id 沒姓名」的話，一個「有姓名沒 id」的實作照樣通過 ——
   * 而那一種更難發現：畫面上看得到名字，帳本卻連不回那個人。
   */
  it.each([
    ["有 id 沒工號", { ...HUMAN, actorEmployeeNo: null }],
    ["有 id 沒姓名", { ...HUMAN, actorName: null }],
    ["有姓名沒 id", { ...HUMAN, actorEmployeeId: null }],
  ])("%s：擋下", (_label, snapshot) => {
    expect(() => assertLedgerActor(snapshot)).toThrow(
      LeaveLedgerInvariantError,
    );
  });
});

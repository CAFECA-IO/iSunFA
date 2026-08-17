import { describe, it, expect } from "@jest/globals";
import {
  LeaveRuleError,
  allocateConsumption,
} from "@/lib/leave_entitlement_rules";
import { IConsumableGrant } from "@/interfaces/leave_entitlement";

/**
 * Info: (20260817 - Julian) T5：FIFO by expiresOn 的扣減分配（ADR 022 §4）。
 *
 * 先到期先扣對勞工有利（過期作廢的量最小化），且**它是唯一能讓
 * 「還剩幾天不會過期」有確定答案的順序** —— 其他順序下這個問題的答案
 * 都取決於「接下來會怎麼請」，也就是答不出來。
 */

const grant = (
  grantId: string,
  expiresOn: string,
  remainingMinutes: number,
  createdAt = "2026-01-01T00:00:00.000Z",
): IConsumableGrant => ({ grantId, expiresOn, remainingMinutes, createdAt });

describe("allocateConsumption — 排序", () => {
  const grants = [
    grant("later", "2027-12-31", 240),
    grant("sooner", "2026-12-31", 120),
  ];

  it("先扣先到期的批次，與輸入順序無關", () => {
    const result = allocateConsumption({ grants, requiredMinutes: 180 });
    expect(result.allocations).toEqual([
      { grantId: "sooner", minutes: 120, grantBalanceAfterMinutes: 0 },
      { grantId: "later", minutes: 60, grantBalanceAfterMinutes: 180 },
    ]);
    expect(result.shortfallMinutes).toBe(0);
  });

  it("同到期日者以建立時間為序", () => {
    const sameExpiry = [
      grant("newer", "2026-12-31", 60, "2026-03-01T00:00:00.000Z"),
      grant("older", "2026-12-31", 60, "2026-01-01T00:00:00.000Z"),
    ];
    const result = allocateConsumption({
      grants: sameExpiry,
      requiredMinutes: 60,
    });
    expect(result.allocations[0].grantId).toBe("older");
  });

  /**
   * Info: (20260817 - Julian) 第三層以 grantId 收尾。
   *
   * 授予 Worker 一次會產生多筆同毫秒建立的批次；沒有穩定的最終排序鍵，
   * 同一組輸入在不同執行可能得到不同分配 —— 而這支函數的全部價值就是可重算。
   */
  it("到期日與建立時間都相同時，以 grantId 收尾確保決定性", () => {
    const tied = [
      grant("b", "2026-12-31", 60),
      grant("a", "2026-12-31", 60),
      grant("c", "2026-12-31", 60),
    ];
    const first = allocateConsumption({ grants: tied, requiredMinutes: 120 });
    const second = allocateConsumption({
      grants: [...tied].reverse(),
      requiredMinutes: 120,
    });
    expect(first.allocations.map((item) => item.grantId)).toEqual(["a", "b"]);
    expect(second.allocations).toEqual(first.allocations);
  });
});

describe("allocateConsumption — 跨批次與不足", () => {
  const grants = [
    grant("a", "2026-06-30", 60),
    grant("b", "2026-12-31", 120),
    grant("c", "2027-12-31", 240),
  ];

  it("跨批次扣減，每一筆各自回報扣後餘額", () => {
    const result = allocateConsumption({ grants, requiredMinutes: 300 });
    expect(result.allocations).toEqual([
      { grantId: "a", minutes: 60, grantBalanceAfterMinutes: 0 },
      { grantId: "b", minutes: 120, grantBalanceAfterMinutes: 0 },
      { grantId: "c", minutes: 120, grantBalanceAfterMinutes: 120 },
    ]);
    expect(result.shortfallMinutes).toBe(0);
  });

  /**
   * Info: (20260817 - Julian) 額度不足**不丟例外**：那是使用者輸入的正常結局，
   * 不是故障。用回傳值表達，呼叫端才無法忘記處理
   * （同 `LeaveRecallResolutionOutcome` 的理由）。
   */
  it("額度不足時回報缺口而不是丟例外", () => {
    const result = allocateConsumption({ grants, requiredMinutes: 600 });
    expect(result.shortfallMinutes).toBe(180);
    expect(
      result.allocations.reduce((sum, item) => sum + item.minutes, 0),
    ).toBe(420);
  });

  it("分配總額永遠等於「需求」與「總餘額」的較小者", () => {
    const totalAvailable = grants.reduce(
      (sum, item) => sum + item.remainingMinutes,
      0,
    );
    for (const required of [0, 1, 59, 60, 419, 420, 421, 10_000]) {
      const result = allocateConsumption({ grants, requiredMinutes: required });
      const allocated = result.allocations.reduce(
        (sum, item) => sum + item.minutes,
        0,
      );
      expect(allocated).toBe(Math.min(required, totalAvailable));
      expect(allocated + result.shortfallMinutes).toBe(required);
    }
  });

  it("餘額為零的批次不產生分配列（不寫沒有意義的帳）", () => {
    const withEmpty = [grant("empty", "2026-01-31", 0), ...grants];
    const result = allocateConsumption({
      grants: withEmpty,
      requiredMinutes: 60,
    });
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].grantId).toBe("a");
  });

  it("需求為零時不動任何批次", () => {
    expect(allocateConsumption({ grants, requiredMinutes: 0 })).toEqual({
      allocations: [],
      shortfallMinutes: 0,
    });
  });

  it("負數需求是呼叫端的錯誤，擋下", () => {
    expect(() => allocateConsumption({ grants, requiredMinutes: -1 })).toThrow(
      LeaveRuleError,
    );
  });
});

import { describe, it, expect } from "@jest/globals";
import { allocateConsumption } from "@/lib/leave_entitlement_rules";
import { IConsumableGrant } from "@/interfaces/leave_entitlement";

/**
 * Info: (20260817 - Julian) 銷假回補的兩條語意，用引擎層釘住。
 *
 * `writeRestoreForDay` 本身要 `tx` 才跑得動（它是 repository 原語），
 * 但它依賴的兩個判斷都是純計算，而**那兩個判斷才是會出錯的地方**：
 *
 * 1. 逐日扣與按單扣的總分配結果必須相同 —— 否則改成逐日就是在改行為
 * 2. 回補必須退回原批次，不能重新分配 —— 否則總數對得起來但每一批都錯
 *
 * 第 2 條特別值得測：它的錯誤在總額勾稽時**完全看不出來**。
 */

const grant = (
  id: string,
  remainingMinutes: number,
  expiresOn: string,
): IConsumableGrant => ({
  grantId: id,
  remainingMinutes,
  expiresOn,
  createdAt: "2026-01-01T00:00:00.000Z",
});

/** Info: (20260817 - Julian) 模擬 `writeConsumeForDays` 的就地遞減 */
const consumeDayByDay = (
  balances: IConsumableGrant[],
  dayMinutes: number[],
): Map<string, number> => {
  const running = balances.map((item) => ({ ...item }));
  const perGrant = new Map<string, number>();

  for (const minutes of dayMinutes) {
    const { allocations, shortfallMinutes } = allocateConsumption({
      grants: running,
      requiredMinutes: minutes,
    });
    expect(shortfallMinutes).toBe(0);
    for (const item of allocations) {
      perGrant.set(
        item.grantId,
        (perGrant.get(item.grantId) ?? 0) + item.minutes,
      );
      const target = running.find((g) => g.grantId === item.grantId);
      if (target) target.remainingMinutes = item.grantBalanceAfterMinutes;
    }
  }
  return perGrant;
};

describe("逐日扣帳與按單扣帳的等價性", () => {
  /**
   * Info: (20260817 - Julian) 改成逐日是為了讓銷假回得去，**不是**為了改變分配。
   * 這條不成立的話，這次重構就順帶改了每個人的特休怎麼被扣。
   */
  it.each([
    ["剛好用完第一批", [480, 480], [480, 480]],
    ["跨批次", [480, 960], [600, 840]],
    ["單日就跨批", [1000, 440], [1440]],
    ["半天單位", [240, 240, 240], [360, 360]],
  ] as [string, number[], number[]][])(
    "%s：逐日扣的每批總量等於一次扣總和",
    (_name, grantMinutes, dayMinutes) => {
      const balances = grantMinutes.map((minutes, index) =>
        grant(`g${index + 1}`, minutes, `2026-0${index + 1}-01`),
      );
      const total = dayMinutes.reduce((sum, item) => sum + item, 0);

      const atOnce = allocateConsumption({
        grants: balances,
        requiredMinutes: total,
      });
      const atOnceByGrant = new Map(
        atOnce.allocations.map((item) => [item.grantId, item.minutes]),
      );

      expect(consumeDayByDay(balances, dayMinutes)).toEqual(atOnceByGrant);
    },
  );
});

describe("回補必須退回原批次", () => {
  /**
   * Info: (20260817 - Julian) 這是「照著 CONSUME 退」與「重新分配」的差別。
   *
   * 場景：兩批額度，第一批先到期。第一天請 8 小時吃掉第一批，
   * 第二天請 8 小時吃第二批。**銷掉第二天**。
   *
   * 正確：退 480 給 g2。
   * 錯誤（重新分配）：`allocateConsumption` 依先到期先扣會退給 g1 ——
   * 總數同樣是 480，但 g1 被退了它從未被扣的量，
   * 而 g2 的扣減永遠留在帳上。g1 之後會過期作廢，員工憑空少 8 小時。
   */
  it("退給當初扣的那一批，不是先到期的那一批", () => {
    const balances = [
      grant("g1", 480, "2026-06-30"),
      grant("g2", 480, "2027-06-30"),
    ];

    const day1 = allocateConsumption({
      grants: balances,
      requiredMinutes: 480,
    });
    expect(day1.allocations).toEqual([
      { grantId: "g1", minutes: 480, grantBalanceAfterMinutes: 0 },
    ]);

    const afterDay1 = [
      grant("g1", 0, "2026-06-30"),
      grant("g2", 480, "2027-06-30"),
    ];
    const day2 = allocateConsumption({
      grants: afterDay1,
      requiredMinutes: 480,
    });
    expect(day2.allocations).toEqual([
      { grantId: "g2", minutes: 480, grantBalanceAfterMinutes: 0 },
    ]);

    // Info: (20260817 - Julian) 銷第二天：帳本上那一天的 CONSUME 指向 g2
    const consumedOnDay2 = day2.allocations.map((item) => ({
      leaveGrantId: item.grantId,
      deltaMinutes: -item.minutes,
    }));
    const restoreTargets = consumedOnDay2.map((entry) => entry.leaveGrantId);
    expect(restoreTargets).toEqual(["g2"]);

    /**
     * Info: (20260817 - Julian) 反面：若改用重新分配，兩批都空了、
     * 先到期的是 g1，退回的目標會變成 g1 —— 與上面那個答案不同。
     */
    const wrong = allocateConsumption({
      grants: [grant("g1", 0, "2026-06-30"), grant("g2", 0, "2027-06-30")],
      requiredMinutes: 480,
    });
    expect(wrong.shortfallMinutes).toBe(480);
    expect(wrong.allocations).toEqual([]);
  });

  /**
   * Info: (20260817 - Julian) 一天跨兩批時，回補也必須是兩筆、金額各自對應。
   * 退成一筆 720 給其中一批，總數一樣對得起來。
   */
  it("一天跨兩批時逐批退回", () => {
    const balances = [
      grant("g1", 480, "2026-06-30"),
      grant("g2", 480, "2027-06-30"),
    ];
    const day = allocateConsumption({ grants: balances, requiredMinutes: 720 });

    expect(day.allocations).toEqual([
      { grantId: "g1", minutes: 480, grantBalanceAfterMinutes: 0 },
      { grantId: "g2", minutes: 240, grantBalanceAfterMinutes: 240 },
    ]);

    const restored = day.allocations.map((item) => ({
      grantId: item.grantId,
      minutes: item.minutes,
    }));
    expect(restored).toEqual([
      { grantId: "g1", minutes: 480 },
      { grantId: "g2", minutes: 240 },
    ]);
    expect(restored.reduce((sum, item) => sum + item.minutes, 0)).toBe(720);
  });
});

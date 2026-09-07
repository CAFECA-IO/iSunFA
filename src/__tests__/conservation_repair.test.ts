import { describe, it, expect } from "@jest/globals";
import {
  CONSERVATION_REPAIR_ACTION,
  resolveConservationRepair,
} from "@/lib/quota/conservation_repair";

/**
 * Info: (20260818 - Luphia) 修復腳本的判斷（`scripts/repair_wallet_conservation.ts`）。
 *
 * 這一組守的是**拒絕**的那一半。凍結的意義是「有人動了不該動的東西」，
 * 因此一支會自己把不明差額抹平的腳本，比不修更糟——它讓那件事無聲無息。
 * 所以規則抽成純函式測，而不是埋在只有維運會跑的腳本裡。
 */

const BASE = {
  diff: BigInt(0),
  unpairedAllocate: BigInt(0),
  alreadyRepaired: false,
  frozen: false,
};

describe("resolveConservationRepair", () => {
  it("守恆成立且未凍結時什麼都不做", () => {
    expect(resolveConservationRepair(BASE).action).toBe(
      CONSERVATION_REPAIR_ACTION.NONE,
    );
  });

  // Info: (20260818 - Luphia) 前一次修到一半（補了分錄卻沒解凍）要能收尾
  it("守恆成立但仍凍結時只解凍", () => {
    const decision = resolveConservationRepair({ ...BASE, frozen: true });

    expect(decision.action).toBe(CONSERVATION_REPAIR_ACTION.UNFREEZE_ONLY);
    expect(decision.adjustAmount).toBe(BigInt(0));
  });

  it("差額恰好等於未配對的 ALLOCATE 時補一筆負 ADJUST", () => {
    const decision = resolveConservationRepair({
      ...BASE,
      diff: BigInt(40),
      unpairedAllocate: BigInt(40),
      frozen: true,
    });

    expect(decision.action).toBe(CONSERVATION_REPAIR_ACTION.REPAIR);
    expect(decision.adjustAmount).toBe(BigInt(-40));
  });

  /**
   * Info: (20260818 - Luphia) 差一分就不動手。
   *
   * 「取小的那個補」或「差額為正就補」會把其他成因的差額一起吃掉，
   * 而其他成因正是這道防線存在的理由。
   */
  it.each([
    [BigInt(41), BigInt(40)],
    [BigInt(39), BigInt(40)],
    [BigInt(40), BigInt(0)],
    [BigInt(-40), BigInt(40)],
  ])("差額 %s 與未配對 %s 不符時拒絕處理", (diff, unpairedAllocate) => {
    const decision = resolveConservationRepair({
      ...BASE,
      diff,
      unpairedAllocate,
      frozen: true,
    });

    expect(decision.action).toBe(CONSERVATION_REPAIR_ACTION.REFUSE);
    expect(decision.adjustAmount).toBe(BigInt(0));
  });

  /**
   * Info: (20260818 - Luphia) 修過一次又長出差額 → 不是存量問題。
   *
   * 舊帳只會有一筆（修法之前累積的）。再出現代表現在還有一條活路徑在破壞守恆，
   * 或有人直接動了資料——即使金額「解釋得通」也不能補。
   */
  it("已修復過一次就不再自動補平，即使金額對得上", () => {
    const decision = resolveConservationRepair({
      diff: BigInt(40),
      unpairedAllocate: BigInt(40),
      alreadyRepaired: true,
      frozen: true,
    });

    expect(decision.action).toBe(CONSERVATION_REPAIR_ACTION.REFUSE);
  });
});

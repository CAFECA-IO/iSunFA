import { describe, it, expect } from "@jest/globals";
import { quarterlyWindowOf } from "@/lib/overtime_rules";
import { DEFAULT_LEAVE_POLICY_SEED } from "@/constants/leave_policy";
import { LEAVE_POLICY_CODE } from "@/constants/leave_policy";

/**
 * Info: (20260820 - Julian) 滾動三個月窗只有一份定義（review 第 5 輪 M5）。
 */
describe("quarterlyWindowOf", () => {
  /**
   * Info: (20260820 - Julian) reviewer 舉的那一組。期望值由**定義**推出來：
   * 「三個月前的那天再加一天」到「當天」。
   */
  it("2026-08-10 的窗是 2026-05-11 ~ 2026-08-10", () => {
    expect(quarterlyWindowOf("2026-08-10")).toEqual({
      from: "2026-05-11",
      to: "2026-08-10",
    });
  });

  /**
   * Info: (20260820 - Julian) 報表先前自己抄的那一份以**月底**為錨。
   * 這一條把兩者的差距釘住：它不是四捨五入的差別，是 21 天。
   */
  it("以月底為錨會把左端往後推 21 天——那正是報表少算的那幾天", () => {
    const gate = quarterlyWindowOf("2026-08-10");
    const byMonthEnd = quarterlyWindowOf("2026-08-31");

    expect(byMonthEnd.from).toBe("2026-06-01");
    expect(gate.from < byMonthEnd.from).toBe(true);
  });

  // Info: (20260820 - Julian) 月底、閏日、跨年都不得長出第 91 天以外的東西
  it.each([
    ["2026-01-31", "2025-11-01"],
    ["2026-03-01", "2025-12-02"],
    ["2026-12-31", "2026-10-01"],
  ])("%s 的左端是 %s", (anchor, from) => {
    expect(quarterlyWindowOf(anchor).from).toBe(from);
  });
});

/**
 * Info: (20260820 - Julian) 特休不得內建遞延預設（review 第 5 輪 M6）。
 *
 * §38 IV 的原則是年度終結**發給工資**，遞延是經逐個勞工協商同意的例外。
 * 種子先前寫 12，等於替全體員工取得一個沒有人協商過的例外，
 * 而 `LeaveCashOutReason.ANNUAL_YEAR_END` 因此永遠不觸發。
 */
describe("特休種子不預設遞延", () => {
  it("ANNUAL 的 carryForwardMonths 是 0", () => {
    const annual = DEFAULT_LEAVE_POLICY_SEED.find(
      (seed) => seed.code === LEAVE_POLICY_CODE.ANNUAL,
    );
    expect(annual).toBeDefined();
    expect(annual?.carryForwardMonths).toBe(0);
  });

  /**
   * Info: (20260820 - Julian) 全部假別一起看：本模組不得提供任何
   * 「內建預設門檻」（計畫書 §17 缺口 11）。一支只盯 ANNUAL 的測試，
   * 下一次有人替病假加一個預設遞延時不會紅。
   */
  it("沒有任何一個內建假別預設遞延", () => {
    const withCarry = DEFAULT_LEAVE_POLICY_SEED.filter(
      (seed) => seed.carryForwardMonths !== 0,
    ).map((seed) => seed.code);
    expect(withCarry).toEqual([]);
  });
});

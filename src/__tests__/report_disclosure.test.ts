import { describe, expect, it } from "@jest/globals";
import {
  reconcileLegTotals,
  ReconciliationVerdictEnum,
} from "@/lib/utils/report_disclosure";

/**
 * Info: (20260801 - Luphia) 這組測試固化的是一次實測發現:
 * 報告頁尾印出計算公式邀請查核者逐列重算,但逐段顯示到小數 2 位、總計取自上游
 * 未捨入的 total_co2eKg,兩者可差幾分錢 —— 而「查核者會不會發現對不上」取決於運氣。
 *   R01 台北→曼徹斯特:逐列 5,880.96 vs 總計 5,880.97(差 0.01)
 *   R02 東京→巴黎:    恰好對上
 * 對審計文件而言「加總對不上」是必被提問的一項,故必須一律揭露而非碰運氣。
 */
describe("reconcileLegTotals", () => {
  it("重現 R01:差 0.01 判定為捨入可解釋", () => {
    const result = reconcileLegTotals(
      ["0.8037768", "5878.357655", "1.8005955"],
      "5880.9703",
    );
    expect(result.verdict).toBe(ReconciliationVerdictEnum.WITHIN_ROUNDING);
    expect(result.displayedSum).toBe(5880.96);
    expect(result.displayedTotal).toBe(5880.97);
    expect(result.difference).toBe(0.01);
  });

  it("重現 R02:恰好對上", () => {
    const result = reconcileLegTotals(
      ["2.473", "5852.32", "1.8175"],
      "5856.61",
    );
    expect(result.verdict).toBe(ReconciliationVerdictEnum.EXACT);
    expect(result.difference).toBe(0);
  });

  /**
   * Info: (20260801 - Luphia) 容差為 (段數 + 1) × 0.005:每段各偏最多 0.005,
   * 總計自身的顯示也偏最多 0.005。界內是排版問題,界外是兩套推導真的分歧。
   */
  it("容差邊界:界上仍屬捨入,界外即為分歧", () => {
    // Info: (20260801 - Luphia) 3 段 → 容差 0.02
    expect(reconcileLegTotals(["1", "1", "1"], "3.02").verdict).toBe(
      ReconciliationVerdictEnum.WITHIN_ROUNDING,
    );
    expect(reconcileLegTotals(["1", "1", "1"], "3.03").verdict).toBe(
      ReconciliationVerdictEnum.DIVERGENT,
    );
  });

  it("容差隨段數增加", () => {
    // Info: (20260801 - Luphia) 10 段 → 容差 0.055,故 0.05 仍屬捨入
    expect(reconcileLegTotals(Array(10).fill("1"), "10.05").verdict).toBe(
      ReconciliationVerdictEnum.WITHIN_ROUNDING,
    );
  });

  it("負向差異一視同仁", () => {
    expect(reconcileLegTotals(["1", "1", "1"], "2.97").verdict).toBe(
      ReconciliationVerdictEnum.DIVERGENT,
    );
  });

  /**
   * Info: (20260801 - Luphia) 缺值不以 0 充數:那會讓一個缺件看起來像一筆零排放,
   * 且會憑空產生一個「對不上」的差額。
   */
  it.each([
    ["總計缺漏", ["1", "2"], undefined],
    ["某段缺漏", ["1", undefined], "3"],
    ["空字串", ["1", ""], "3"],
    ["非數字", ["1", "abc"], "3"],
  ])("%s 時回 INDETERMINATE 且不產生差額", (_label, legs, total) => {
    const result = reconcileLegTotals(legs, total);
    expect(result.verdict).toBe(ReconciliationVerdictEnum.INDETERMINATE);
    expect(result.difference).toBe(0);
  });

  /**
   * Info: (20260801 - Luphia) 以整數分位相加而非直接累加浮點數 ——
   * 否則勾稽函式自己就會引入誤差,反而製造出不存在的「對不上」。
   */
  it("百筆 0.01 相加精確為 1.00", () => {
    const result = reconcileLegTotals(Array(100).fill("0.01"), "1.00");
    expect(result.displayedSum).toBe(1);
    expect(result.verdict).toBe(ReconciliationVerdictEnum.EXACT);
  });
});

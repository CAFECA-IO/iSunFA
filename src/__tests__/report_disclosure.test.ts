import { describe, expect, it } from "@jest/globals";
import {
  EstimationShareBasisEnum,
  reconcileLegTotals,
  ReconciliationVerdictEnum,
  summarizeEstimatedLegs,
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

/**
 * Info: (20260801 - Luphia) 推估段的材性。
 *
 * 現行揭露只有距離欄旁的小字 `est.`,讀者無從判斷這件事有多重要 ——
 * 一段推估且占總排放 0.03%,與兩段推估且占 40%,是完全不同的兩份報告。
 *
 * 實測 R02(東京→巴黎)三段中有兩段推估(東京與巴黎的市區接駁),
 * 成因是 dockerfiles/osrm/Dockerfile 只載入 taiwan-latest.osm.pbf,
 * 非台灣的陸運段沒有路網資料。但那兩段合計僅占 0.07% —— 有了這個數字讀者才知道可以放心。
 */
describe("summarizeEstimatedLegs", () => {
  const r02 = [
    { mode: "LAND", co2eKg: "2.473", isFallback: true },
    { mode: "AIR", co2eKg: "5852.32" },
    { mode: "LAND", co2eKg: "1.8175", isFallback: true },
  ];

  it("重現 R02:3 段中 2 段推估,占比約 0.07%", () => {
    const summary = summarizeEstimatedLegs(r02);
    expect(summary.estimatedCount).toBe(2);
    expect(summary.totalCount).toBe(3);
    expect((summary.share as number) * 100).toBeCloseTo(0.0733, 3);
  });

  it("無推估段時不產生占比", () => {
    const summary = summarizeEstimatedLegs([{ co2eKg: "1" }, { co2eKg: "2" }]);
    expect(summary.estimatedCount).toBe(0);
    expect(summary.share).toBeUndefined();
  });

  it("全部推估時占比為 100%", () => {
    expect(
      summarizeEstimatedLegs([
        { co2eKg: "3", isFallback: true },
        { co2eKg: "7", isFallback: true },
      ]).share,
    ).toBe(1);
  });

  /**
   * Info: (20260801 - Luphia) 「算不出來」與「不重要」是兩件事。
   * 缺值或分母為 0 時回 undefined 而非 0 —— 填 0 會讓一個未知看起來像已確認的無關緊要。
   */
  it.each([
    ["逐段數值缺漏", [{ isFallback: true }, { co2eKg: "5" }]],
    ["逐段數值為空字串", [{ co2eKg: "", isFallback: true }, { co2eKg: "5" }]],
    ["逐段數值非數字", [{ co2eKg: "abc", isFallback: true }, { co2eKg: "5" }]],
    ["分母為 0", [{ co2eKg: "0", isFallback: true }]],
  ])("%s 時不給占比", (_label, legs) => {
    const summary = summarizeEstimatedLegs(legs);
    expect(summary.estimatedCount).toBeGreaterThan(0);
    expect(summary.share).toBeUndefined();
  });

  // Info: (20260801 - Luphia) isFallback 未設定不等於 false 之外的任何值,只有 true 才算推估
  it("僅 isFallback === true 計入推估", () => {
    expect(
      summarizeEstimatedLegs([
        { co2eKg: "1", isFallback: false },
        { co2eKg: "1" },
      ]).estimatedCount,
    ).toBe(0);
  });

  /**
   * Info: (20260801 - Luphia) 逐模式回報是必要的:陸運加成係數為 1.2、海運為 1.5
   * (ESTIMATION_TORTUOSITY_FACTORS)。先前揭露文字一律寫「× 1.2」,
   * 被標為 est. 的海運段揭露值因此是錯的 —— 查核者照它回推距離會得到錯誤結果。
   */
  it("回報出現推估的運輸模式,供揭露文字列出對應係數", () => {
    expect(summarizeEstimatedLegs(r02).estimatedModes).toEqual(["LAND"]);
    expect(
      summarizeEstimatedLegs([
        { mode: "SEA", co2eKg: "1", isFallback: true },
        { mode: "LAND", co2eKg: "1" },
      ]).estimatedModes,
    ).toEqual(["SEA"]);
  });

  // Info: (20260801 - Luphia) 依固定順序而非出現順序:同一份報告的措辭不該因段落排列而改變
  it("模式順序固定為 LAND → SEA → AIR,與段落出現順序無關", () => {
    expect(
      summarizeEstimatedLegs([
        { mode: "SEA", co2eKg: "1", isFallback: true },
        { mode: "LAND", co2eKg: "1", isFallback: true },
      ]).estimatedModes,
    ).toEqual(["LAND", "SEA"]);
  });

  /**
   * Info: (20260801 - Luphia) 使用者關閉碳排計算時報告內沒有排放數值,
   * 材性只能以距離衡量。基準必須隨占比一起回報 ——
   * 0.07% 的排放占比與 0.07% 的距離占比是不同的意思。
   */
  it("以距離為基準時改用 distanceKm 計算占比", () => {
    const summary = summarizeEstimatedLegs(
      [
        { mode: "LAND", distanceKm: 20, co2eKg: "999", isFallback: true },
        { mode: "AIR", distanceKm: 80, co2eKg: "1" },
      ],
      EstimationShareBasisEnum.DISTANCE,
    );
    expect(summary.share).toBeCloseTo(0.2, 10);
    expect(summary.shareBasis).toBe(EstimationShareBasisEnum.DISTANCE);
  });

  it("預設基準為排放量", () => {
    expect(summarizeEstimatedLegs(r02).shareBasis).toBe(
      EstimationShareBasisEnum.CO2E,
    );
  });

  it("以距離為基準但缺距離值時不給占比", () => {
    expect(
      summarizeEstimatedLegs(
        [{ mode: "LAND", co2eKg: "1", isFallback: true }],
        EstimationShareBasisEnum.DISTANCE,
      ).share,
    ).toBeUndefined();
  });

  it("無推估段時模式清單為空", () => {
    expect(
      summarizeEstimatedLegs([{ mode: "LAND", co2eKg: "1" }]).estimatedModes,
    ).toEqual([]);
  });
});

import { describe, expect, it } from "@jest/globals";
import {
  LOGISTICS_METHODOLOGY_SECTIONS,
  METHODOLOGY_DATASET_COUNTS,
} from "@/constants/logistics_methodology";
import {
  EMISSION_FACTORS,
  ESTIMATION_TORTUOSITY_FACTORS,
  MIN_AIR_LEG_DISTANCE_KM,
  MIN_SEA_LEG_DISTANCE_KM,
} from "@/constants/logistics";
import airportsData from "@/lib/data/airports.json";
import seaportsData from "@/lib/data/seaports.json";
import shippingLanes from "@/lib/data/shipping_lanes.json";

/**
 * Info: (20260801 - Luphia) 方法論說明的防漂移測試。
 *
 * 這份說明會被查核者當作依據,因此它「與實作一致」必須由測試保證而非靠人記得同步。
 * 資料筆數無法從常數取得(靜態 JSON,且前端不宜為了顯示筆數而載入五千筆資料),
 * 故寫成常數並在此對實際檔案斷言 —— 資料換版時測試失敗,不會靜默過期。
 */
describe("METHODOLOGY_DATASET_COUNTS", () => {
  it("機場總數與實際資料一致", () => {
    expect(METHODOLOGY_DATASET_COUNTS.airportsTotal).toBe(
      (airportsData as unknown[]).length,
    );
  });

  /**
   * Info: (20260801 - Luphia) 可選機場數必須與 getNearestAirport 的實際篩選條件一致
   * (具備 IATA 代碼)。若日後篩選條件改變而此處未同步,說明就會宣稱一個錯誤的數字。
   */
  it("可選機場數與 IATA 篩選條件的結果一致", () => {
    const selectable = (
      airportsData as unknown as { iataCode?: string }[]
    ).filter((airport) => Boolean(airport.iataCode));
    expect(METHODOLOGY_DATASET_COUNTS.airportsSelectable).toBe(
      selectable.length,
    );
  });

  it("港口數與實際資料一致", () => {
    expect(METHODOLOGY_DATASET_COUNTS.seaports).toBe(
      (seaportsData as unknown[]).length,
    );
  });

  it("航線線段數與實際圖資一致", () => {
    expect(METHODOLOGY_DATASET_COUNTS.shippingLaneFeatures).toBe(
      (shippingLanes as unknown as { features: unknown[] }).features.length,
    );
  });
});

/**
 * Info: (20260801 - Luphia) 說明中出現的每個數值都必須由常數插入,不可重打一遍。
 * 以下斷言檢查「說明文字確實含有當前常數值」—— 調參後若說明未跟上,測試會失敗。
 */
describe("LOGISTICS_METHODOLOGY_SECTIONS", () => {
  const allText = LOGISTICS_METHODOLOGY_SECTIONS.map(
    (section) =>
      `${section.title}${(section.paragraphs ?? []).join("")}${(
        section.items ?? []
      )
        .map((item) => `${item.term}${item.detail}`)
        .join("")}`,
  ).join("");

  it.each([
    ["陸運係數", EMISSION_FACTORS.LAND],
    ["海運係數", EMISSION_FACTORS.SEA],
    ["空運係數", EMISSION_FACTORS.AIR],
    ["陸運繞行係數", String(ESTIMATION_TORTUOSITY_FACTORS.LAND)],
    ["海運繞行係數", String(ESTIMATION_TORTUOSITY_FACTORS.SEA)],
    ["海運適用門檻", String(MIN_SEA_LEG_DISTANCE_KM)],
    ["空運適用門檻", String(MIN_AIR_LEG_DISTANCE_KM)],
  ])("說明文字含當前的%s", (_label, value) => {
    expect(allText).toContain(value);
  });

  // Info: (20260801 - Luphia) 章節識別碼供錨點與 React key 使用,重複會導致渲染異常
  it("章節識別碼不重複", () => {
    const ids = LOGISTICS_METHODOLOGY_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("每個章節至少有段落或條列", () => {
    LOGISTICS_METHODOLOGY_SECTIONS.forEach((section) => {
      const hasContent =
        (section.paragraphs?.length ?? 0) > 0 ||
        (section.items?.length ?? 0) > 0;
      expect(hasContent).toBe(true);
    });
  });

  /**
   * Info: (20260801 - Luphia) 已知限制節是這份說明最不可省的部分:
   * 讀者要判斷報告是否足以支持其用途,靠的是限制而非原理。
   * 固化其存在與規模,避免日後被「精簡」掉。
   */
  it("包含已知限制節且不少於七項", () => {
    const limitations = LOGISTICS_METHODOLOGY_SECTIONS.find(
      (section) => section.id === "limitations",
    );
    expect(limitations).toBeDefined();
    expect(limitations?.items?.length ?? 0).toBeGreaterThanOrEqual(7);
  });
});

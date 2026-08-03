import { describe, expect, it } from "@jest/globals";
import {
  interpolateMethodologySections,
  interpolateMethodologyText,
  METHODOLOGY_DATASET_COUNTS,
  METHODOLOGY_TOKENS,
  METHODOLOGY_TOKEN_PATTERN,
  type IMethodologySection,
} from "@/constants/logistics_methodology";
import airportsData from "@/lib/data/airports.json";
import seaportsData from "@/lib/data/seaports.json";
import shippingLanes from "@/lib/data/shipping_lanes.json";
import { transportationCarbonFootprintCalculator as en } from "@/i18n/locales/en/transportation_carbon_footprint_calculator";
import { transportationCarbonFootprintCalculator as zhTw } from "@/i18n/locales/zh_tw/transportation_carbon_footprint_calculator";
import { transportationCarbonFootprintCalculator as zhCn } from "@/i18n/locales/zh_cn/transportation_carbon_footprint_calculator";
import { transportationCarbonFootprintCalculator as ja } from "@/i18n/locales/ja/transportation_carbon_footprint_calculator";
import { transportationCarbonFootprintCalculator as ko } from "@/i18n/locales/ko/transportation_carbon_footprint_calculator";

/**
 * Info: (20260802 - Luphia) 方法論說明的防漂移測試。
 *
 * 這份說明會被查核者當作依據,因此它「與實作一致」必須由測試保證而非靠人記得同步。
 */
describe("METHODOLOGY_DATASET_COUNTS", () => {
  it("機場總數與實際資料一致", () => {
    expect(METHODOLOGY_DATASET_COUNTS.airportsTotal).toBe(
      (airportsData as unknown[]).length,
    );
  });

  /**
   * Info: (20260802 - Luphia) 可選機場數必須與 getNearestAirport 的實際篩選條件一致
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
 * Info: (20260802 - Luphia) 語言檔只放 {{token}},實際值由常數代入 ——
 * 係數與門檻是計算採用的值,寫進語言檔就是把同一個事實複製五份,調參後必然有漏。
 */
describe("插值機制", () => {
  it("已登錄的 token 被替換為常數值", () => {
    expect(interpolateMethodologyText("陸運 {{landFactor}} kg")).toBe(
      `陸運 ${METHODOLOGY_TOKENS.landFactor} kg`,
    );
  });

  /**
   * Info: (20260802 - Luphia) 未登錄的 token 原樣保留而非清空:
   * 留著 {{未知}} 會在畫面上顯眼地暴露問題,清空則產生一句讀來通順但缺了數值的說明。
   */
  it("未登錄的 token 原樣保留", () => {
    expect(interpolateMethodologyText("值為 {{notRegistered}}")).toBe(
      "值為 {{notRegistered}}",
    );
  });

  it("非陣列輸入回空陣列而不拋錯", () => {
    expect(
      interpolateMethodologySections(undefined as unknown as undefined),
    ).toEqual([]);
    expect(
      interpolateMethodologySections("not-an-array" as unknown as undefined),
    ).toEqual([]);
  });

  it("缺漏欄位不致整份說明消失", () => {
    const result = interpolateMethodologySections([
      { id: "x" } as unknown as IMethodologySection,
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("");
    expect(result[0].items).toEqual([]);
  });
});

const LOCALES = [
  ["en", en],
  ["zh_tw", zhTw],
  ["zh_cn", zhCn],
  ["ja", ja],
  ["ko", ko],
] as const;

const sectionsOf = (dictionary: {
  methodology?: { sections?: IMethodologySection[] };
}): IMethodologySection[] => dictionary.methodology?.sections ?? [];

const allTextOf = (sections: IMethodologySection[]): string[] =>
  sections.flatMap((section) => [
    section.title,
    ...(section.paragraphs ?? []),
    ...(section.items ?? []).flatMap((item) => [item.term, item.detail]),
  ]);

describe("語言檔的方法論說明", () => {
  it.each(LOCALES)("%s 有 sections 且章節數一致", (_locale, dictionary) => {
    expect(sectionsOf(dictionary).length).toBe(sectionsOf(zhTw).length);
  });

  /**
   * Info: (20260802 - Luphia) 章節 id 是錨點與 React key,各語言必須一致 ——
   * 不一致會讓切換語言時 React 重建整個列表,且錨點失效。
   */
  it.each(LOCALES)(
    "%s 的章節 id 與順序與 zh_tw 相同",
    (_locale, dictionary) => {
      expect(sectionsOf(dictionary).map((s) => s.id)).toEqual(
        sectionsOf(zhTw).map((s) => s.id),
      );
    },
  );

  it.each(LOCALES)("%s 各章節的條目數與 zh_tw 相同", (_locale, dictionary) => {
    expect(sectionsOf(dictionary).map((s) => (s.items ?? []).length)).toEqual(
      sectionsOf(zhTw).map((s) => (s.items ?? []).length),
    );
  });

  /**
   * Info: (20260802 - Luphia) 語言檔用到的每個 token 都必須在 METHODOLOGY_TOKENS 登錄,
   * 否則寫了也不會被替換,畫面上會直接出現 {{token}}。
   */
  it.each(LOCALES)("%s 用到的 token 全部已登錄", (_locale, dictionary) => {
    const used = new Set<string>();
    allTextOf(sectionsOf(dictionary)).forEach((text) => {
      for (const match of text.matchAll(METHODOLOGY_TOKEN_PATTERN)) {
        used.add(match[1]);
      }
    });
    const unknown = [...used].filter(
      (name) => !Object.prototype.hasOwnProperty.call(METHODOLOGY_TOKENS, name),
    );
    expect(unknown).toEqual([]);
  });

  /**
   * Info: (20260802 - Luphia) 各語言用到的 token 集合必須相同 ——
   * 某語言漏掉一個 token,就是那個語言的說明少了一個數值。
   */
  it.each(LOCALES)("%s 的 token 集合與 zh_tw 相同", (_locale, dictionary) => {
    const tokensOf = (sections: IMethodologySection[]) =>
      [
        ...new Set(
          allTextOf(sections).flatMap((text) =>
            [...text.matchAll(METHODOLOGY_TOKEN_PATTERN)].map((m) => m[1]),
          ),
        ),
      ].sort();
    expect(tokensOf(sectionsOf(dictionary))).toEqual(
      tokensOf(sectionsOf(zhTw)),
    );
  });

  /**
   * Info: (20260802 - Luphia) 已知限制節是這份說明最不可省的部分:
   * 讀者要判斷報告是否足以支持其用途,靠的是限制而非原理。固化其規模避免被「精簡」掉。
   */
  it.each(LOCALES)("%s 的已知限制節不少於九項", (_locale, dictionary) => {
    const limitations = sectionsOf(dictionary).find(
      (section) => section.id === "limitations",
    );
    expect(limitations?.items?.length ?? 0).toBeGreaterThanOrEqual(9);
  });

  // Info: (20260802 - Luphia) 插值後不應殘留任何 {{token}}
  it.each(LOCALES)("%s 插值後無殘留 token", (_locale, dictionary) => {
    const text = allTextOf(
      interpolateMethodologySections(sectionsOf(dictionary)),
    ).join("");
    expect(text).not.toMatch(/\{\{/);
  });
});

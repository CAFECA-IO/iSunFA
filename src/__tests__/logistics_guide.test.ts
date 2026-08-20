import { describe, expect, it } from "@jest/globals";
import {
  GUIDE_FIGURE_CALLOUT_COUNTS,
  GUIDE_FIGURE_IDS,
  GUIDE_TOKENS,
  interpolateGuideChapters,
  type IGuideChapter,
  type IGuideStep,
} from "@/constants/logistics_guide";
import { METHODOLOGY_TOKEN_PATTERN } from "@/constants/logistics_methodology";
import { ANALYSIS_BASE_COSTS } from "@/constants/price";
import { transportationCarbonFootprintCalculator as en } from "@/i18n/locales/en/transportation_carbon_footprint_calculator";
import { transportationCarbonFootprintCalculator as zhTw } from "@/i18n/locales/zh_tw/transportation_carbon_footprint_calculator";
import { transportationCarbonFootprintCalculator as zhCn } from "@/i18n/locales/zh_cn/transportation_carbon_footprint_calculator";
import { transportationCarbonFootprintCalculator as ja } from "@/i18n/locales/ja/transportation_carbon_footprint_calculator";
import { transportationCarbonFootprintCalculator as ko } from "@/i18n/locales/ko/transportation_carbon_footprint_calculator";

/**
 * Info: (20260820 - Luphia) 操作說明的防漂移測試。
 *
 * 這份說明的圖與文是兩份東西:編號標記畫在 guide_figures.tsx,說明寫在五份語言檔,
 * 兩者只靠「順序」對應。一邊多一個標記,另一邊的說明就整組錯位 ——
 * 而錯位不拋錯、不留痕跡,只會讓圖指向錯的地方。故以測試固定這個對應關係。
 */

const LOCALES = [
  ["en", en],
  ["zh_tw", zhTw],
  ["zh_cn", zhCn],
  ["ja", ja],
  ["ko", ko],
] as const;

type Dictionary = { guide?: { chapters?: IGuideChapter[] } };

const chaptersOf = (dictionary: Dictionary): IGuideChapter[] =>
  dictionary.guide?.chapters ?? [];

const stepsOf = (chapters: IGuideChapter[]): IGuideStep[] =>
  chapters.flatMap((chapter) => chapter.steps ?? []);

const allTextOf = (chapters: IGuideChapter[]): string[] =>
  chapters.flatMap((chapter) => [
    chapter.title,
    chapter.summary ?? "",
    ...(chapter.steps ?? []).flatMap((step) => [
      step.title,
      step.body,
      ...(step.notes ?? []),
      ...(step.callouts ?? []),
    ]),
  ]);

describe("插圖標記數的登錄", () => {
  it("每個插圖識別碼都登錄了標記數", () => {
    expect(Object.keys(GUIDE_FIGURE_CALLOUT_COUNTS).sort()).toEqual(
      [...GUIDE_FIGURE_IDS].sort(),
    );
  });

  it("標記數皆為正整數", () => {
    Object.values(GUIDE_FIGURE_CALLOUT_COUNTS).forEach((count) => {
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThan(0);
    });
  });
});

/**
 * Info: (20260820 - Luphia) 費用取自 ANALYSIS_BASE_COSTS 而非寫死在語言檔:
 * 調價後五份語言檔都要改,必然有漏,而漏掉的那份會讓說明書上的價格與實際扣款不一致。
 */
describe("插值 token", () => {
  it("analysisCost 與實際扣點金額一致", () => {
    expect(GUIDE_TOKENS.analysisCost).toBe(
      String(ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT),
    );
  });

  it("非陣列輸入回空陣列而不拋錯", () => {
    expect(interpolateGuideChapters(undefined)).toEqual([]);
    expect(
      interpolateGuideChapters("not-an-array" as unknown as undefined),
    ).toEqual([]);
  });

  it("缺漏欄位不致整份說明消失", () => {
    const result = interpolateGuideChapters([
      { id: "x" } as unknown as IGuideChapter,
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("");
    expect(result[0].steps).toEqual([]);
  });
});

describe("語言檔的操作說明", () => {
  it.each(LOCALES)("%s 有章節且章節數一致", (_locale, dictionary) => {
    expect(chaptersOf(dictionary).length).toBe(chaptersOf(zhTw).length);
    expect(chaptersOf(dictionary).length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260820 - Luphia) 章節與步驟的 id 是側邊目錄的錨點,也是 React key ——
   * 不一致會讓切換語言時 React 重建整份清單,且目錄的連結全部失效。
   */
  it.each(LOCALES)(
    "%s 的章節 id 與順序與 zh_tw 相同",
    (_locale, dictionary) => {
      expect(chaptersOf(dictionary).map((chapter) => chapter.id)).toEqual(
        chaptersOf(zhTw).map((chapter) => chapter.id),
      );
    },
  );

  it.each(LOCALES)(
    "%s 的步驟 id 與順序與 zh_tw 相同",
    (_locale, dictionary) => {
      expect(stepsOf(chaptersOf(dictionary)).map((step) => step.id)).toEqual(
        stepsOf(chaptersOf(zhTw)).map((step) => step.id),
      );
    },
  );

  /**
   * Info: (20260820 - Luphia) 章節與步驟共用同一個錨點前綴,
   * 故步驟 id 必須全域唯一 —— 撞名會讓兩個 id 相同的元素同時存在,錨點跳到先出現的那個。
   */
  it("步驟 id 全域唯一,且不與章節 id 相撞", () => {
    const ids = [
      ...chaptersOf(zhTw).map((chapter) => chapter.id),
      ...stepsOf(chaptersOf(zhTw)).map((step) => step.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(LOCALES)("%s 指定的插圖都是已登錄的識別碼", (_locale, dictionary) => {
    const unknown = stepsOf(chaptersOf(dictionary))
      .map((step) => step.figure)
      .filter(
        (figure): figure is NonNullable<typeof figure> =>
          figure !== undefined && !GUIDE_FIGURE_IDS.includes(figure),
      );
    expect(unknown).toEqual([]);
  });

  /**
   * Info: (20260820 - Luphia) 這是本檔最重要的一條:圖上的標記數與圖下的說明數必須相等。
   * 不相等即代表某個標記沒有說明,或某條說明指向不存在的標記。
   */
  it.each(LOCALES)("%s 的圖說數與圖上標記數相符", (_locale, dictionary) => {
    stepsOf(chaptersOf(dictionary)).forEach((step) => {
      const expected = step.figure
        ? GUIDE_FIGURE_CALLOUT_COUNTS[step.figure]
        : 0;
      expect({ id: step.id, callouts: (step.callouts ?? []).length }).toEqual({
        id: step.id,
        callouts: expected,
      });
    });
  });

  it.each(LOCALES)("%s 每個步驟都有標題與內文", (_locale, dictionary) => {
    stepsOf(chaptersOf(dictionary)).forEach((step) => {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    });
  });

  it.each(LOCALES)("%s 用到的 token 全部已登錄", (_locale, dictionary) => {
    const used = new Set<string>();
    allTextOf(chaptersOf(dictionary)).forEach((text) => {
      for (const match of text.matchAll(METHODOLOGY_TOKEN_PATTERN)) {
        used.add(match[1]);
      }
    });
    const unknown = [...used].filter(
      (name) => !Object.prototype.hasOwnProperty.call(GUIDE_TOKENS, name),
    );
    expect(unknown).toEqual([]);
  });

  // Info: (20260820 - Luphia) 某語言漏掉一個 token,就是那個語言的說明少了一個數值
  it.each(LOCALES)("%s 的 token 集合與 zh_tw 相同", (_locale, dictionary) => {
    const tokensOf = (chapters: IGuideChapter[]) =>
      [
        ...new Set(
          allTextOf(chapters).flatMap((text) =>
            [...text.matchAll(METHODOLOGY_TOKEN_PATTERN)].map(
              (match) => match[1],
            ),
          ),
        ),
      ].sort();
    expect(tokensOf(chaptersOf(dictionary))).toEqual(
      tokensOf(chaptersOf(zhTw)),
    );
  });

  it.each(LOCALES)("%s 插值後無殘留 token", (_locale, dictionary) => {
    const text = allTextOf(
      interpolateGuideChapters(chaptersOf(dictionary)),
    ).join("");
    expect(text).not.toMatch(/\{\{/);
  });
});

/**
 * Info: (20260820 - Luphia) 限制摘要是原本頁尾折疊區真正想達成的事:
 * 看到數字的人同時看到數字的邊界。固化其規模,避免日後被當成裝飾刪掉。
 */
const highlightsOf = (dictionary: {
  methodology?: { highlights?: string[] };
}): string[] => dictionary.methodology?.highlights ?? [];

/**
 * Info: (20260820 - Luphia) ja / ko / zh_cn 的限制摘要刻意維持英文回退,
 * 與同一區塊的 sections 一致 —— 審計用詞的準確度無法自行驗證,
 * 而譯錯的限制摘要比英文原文更危險:讀者會以為自己讀懂了。
 */
const FALLBACK_LOCALES = ["ja", "ko", "zh_cn"] as const;

describe("報告旁的限制摘要", () => {
  it.each(LOCALES)("%s 有三條限制摘要", (_locale, dictionary) => {
    expect(highlightsOf(dictionary).length).toBeGreaterThanOrEqual(3);
    expect(highlightsOf(dictionary).length).toBe(highlightsOf(zhTw).length);
  });

  /**
   * Info: (20260820 - Luphia) 回退語言必須與 en **逐字相同**。
   *
   * 沒有這條斷言,英文文案更新後三份回退會靜默留在舊版 ——
   * 而回退的內容既然是英文,任何差異就只可能是漏同步,不可能是翻譯。
   * 這也是「翻譯落地」的驗收點:某語言不再等於 en,即代表它已翻譯,
   * 屆時應同步移除該語言檔 highlights 上方的回退註解。
   */
  it.each(
    LOCALES.filter(([locale]) => FALLBACK_LOCALES.includes(locale as never)),
  )("%s 的限制摘要與 en 的英文回退逐字相同", (_locale, dictionary) => {
    expect(highlightsOf(dictionary)).toEqual(highlightsOf(en));
  });

  // Info: (20260820 - Luphia) zh_tw 是來源語言,必須是中文而非回退
  it("zh_tw 的限制摘要不是英文回退", () => {
    expect(highlightsOf(zhTw)).not.toEqual(highlightsOf(en));
  });
});
